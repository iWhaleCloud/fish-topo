/* eslint-disable no-unused-vars */
/* eslint-disable no-prototype-builtins */
import * as dataUtil from '../utils/data_structure_util';
import * as classUtil from '../utils/class_util';
import Eventful from '../event/Eventful';
import Transformable from './transform/Transformable';
import Control from './transform/TransformControl';
import Animatable from '../animation/Animatable';
import Style from './Style';
import RectText from './RectText';
import guid from '../utils/guid';
import Draggable from './drag/Draggable';

/**
 * @class fishTopo.graphic.Element
 * 
 * Root class, everything in FishTopo is an Element. 
 * This is an abstract class, please don't creat an instance directly.
 * 
 * 根类，FishTopo 中所有对象都是 Element 的子类。这是一个抽象类，请不要直接创建这个类的实例。
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
class Element{
    /**
     * @method constructor Element
     */
    constructor(options={}){
        /**
         * @protected
         * @property options 配置项
         */
        this.options = options;
    
        /**
         * @property {String} id
         */
        this.id = 'el-'+guid();

        /**
         * @property {String} name 元素名字
         */
        this.name = '';
        
        /**
         * @property {String} type 元素类型
         */
        this.type = 'element';

        /**
         * @property {Element} parent 父节点，添加到 Group 的元素存在父节点。
         */
        this.parent = null;
    
        /**
         * @property {Boolean} ignore
         * 
         * Whether ignore drawing and events of this object.
         * 
         * 为 true 时忽略图形的绘制以及事件触发
         */
        this.ignore = false;
    
        /**
         * @property {Path} clipPath
         * 
         * This is used for clipping path, all the paths inside Group will be clipped by this path, 
         * which will inherit the transformation of the clipped object.
         * 
         * 用于裁剪的路径，所有 Group 内的路径在绘制时都会被这个路径裁剪，该路径会继承被裁减对象的变换。
         * 
         * @readonly
         * @see http://www.w3.org/TR/2dcontext/#clipping-region
         */
        this.clipPath = null;

        // FIXME Stateful must be mixined after style is setted
        // Stateful.call(this, options);

        /**
         * The String value of `textPosition` needs to be calculated to a real postion.
         * For example, `'inside'` is calculated to `[rect.width/2, rect.height/2]`
         * by default. See `contain/text_util.js#calculateTextPosition` for more details.
         * But some coutom shapes like "pin", "flag" have center that is not exactly
         * `[width/2, height/2]`. So we provide this hook to customize the calculation
         * for those shapes. It will be called if the `style.textPosition` is a String.
         * @param {Obejct} [out] Prepared out object. If not provided, this method should
         *        be responsible for creating one.
         * @param {Style} style
         * @param {Object} rect {x, y, width, height}
         * @return {Obejct} out The same as the input out.
         *         {
         *             x: Number. mandatory.
         *             y: Number. mandatory.
         *             textAlign: String. optional. use style.textAlign by default.
         *             textVerticalAlign: String. optional. use style.textVerticalAlign by default.
         *         }
         */
        this.calculateTextPosition = null;

        /**
         * @property {Boolean} invisible
         * Whether the displayable object is visible. when it is true, the displayable object
         * is not drawn, but the mouse event can still trigger the object.
         */
        this.invisible = false;

        /**
         * @property {Number} z
         */
        this.z = 0;

        /**
         * @property {Number} z2
         */
        this.z2 = 0;

        /**
         * @property {Number} qlevel
         * The q level determines the displayable object can be drawn in which layer canvas.
         */
        this.qlevel = 0;

        this.transformable = true;

        /**
         * @property {Boolean} hasTransformControls
         * Whether this object has transform controls now, hasTransformControls will be set to true when element is clicked.
         * 
         * 元素当前是否带有变换控制工具，当元素被点击的时候 hasTransformControls 会被设置为 true。
         */
        this.hasTransformControls = false;

        /**
         * @property {Array<Control>} controls
         * Whether show transform controls, if showTransformControls is false, no transform controls will be rendered.
         * 
         * 
         * 是否显示变换控制工具，如果此标志位被设置为 false，无论什么情况都不会显示变换控制器。
         */
        this.showTransformControls = false;

        /**
         * @property {Array<Control>} transformControls
         * Transform controls.
         * 
         * 
         * 变换控制工具。
         */
        this.transformControls = [];

        /**
         * @property {Boolean} silent
         * Whether to respond to mouse events.
         */
        this.silent = false;

        /**
         * @property {Boolean} culling
         * If enable culling
         */
        this.culling = false;

        /**
         * @property {String} cursor
         * Mouse cursor when hovered
         */
        this.cursor = this.options.draggable?'move':'default';

        /**
         * @property {String} rectHover
         * If hover area is bounding rect
         */
        this.rectHover = false;

        /**
         * @property {Boolean} progressive
         * Render the element progressively when the value >= 0,
         * usefull for large data.
         */
        this.progressive = false;

        /**
         * @property {Boolean} incremental
         */
        this.incremental = false;

        /**
         * @property {Boolean} globalScaleRatio
         * Scale ratio for global scale.
         */
        this.globalScaleRatio = 1;

        /**
         * @property {Array} animationProcessList
         * All the AnimationProcesses on this Element.
         */
        this.animationProcessList = [];

        /**
         * @property {CanvasRenderingContext2D} ctx
         * Cache canvas context, this will set by Painter.
         */
        this.ctx=null;

        /**
         * @property {Element} prevEl
         * Cache previous element, this will set by Painter.
         */
        this.prevEl=null;

        this.originalBoundingRect=null;

        /**
         * @private
         * @property {FishTopo} __topo
         * 
         * FishTopo instance will be assigned when element is associated with fishTopo
         * 
         * FishTopo 实例对象，会在 element 添加到 FishTopo 实例中后自动赋值
         */
        this.__topo = null;
    
        /**
         * @private
         * @property {Boolean} __dirty
         * 
         * Dirty flag. From which painter will determine if this displayable object needs to be repainted.
         * 
         * 这是一个非常重要的标志位，在绘制大量对象的时候，把 __dirty 标记为 false 可以节省大量操作。
         */
        this.__dirty = true;

        /**
         * @private
         * @property  __clipPaths
         * Shapes for cascade clipping.
         * Can only be `null`/`undefined` or an non-empty array, MUST NOT be an empty array.
         * because it is easy to only using null to check whether clipPaths changed.
         */
        this.__clipPaths = null;

        /**
         * @protected
         * @property __boundingRect 边界矩形
         */
        this.__boundingRect=null;

        /**
         * @property {Style} style
         */
        this.style = new Style(this.options.style, this);

        /**
         * @property {Object} shape 形状
         */
        this.shape = {};
    
        // Extend default shape
        let defaultShape = this.options.shape;
        if (defaultShape) {
            for (let name in defaultShape) {
                if (!this.shape.hasOwnProperty(name)&&defaultShape.hasOwnProperty(name)){
                    this.shape[name] = defaultShape[name];
                }
            }
        }

        classUtil.inheritProperties(this,Eventful,this.options);
        classUtil.inheritProperties(this,Animatable,this.options);
        classUtil.inheritProperties(this,Draggable,this.options);
        classUtil.inheritProperties(this,Transformable,this.options);
        classUtil.copyOwnProperties(this,this.options,['style','shape']);

        this.on("addToStorage",this.addToStorageHandler,this);
        this.on("delFromStorage",this.delFromStorageHandler,this);
        this.one("afterRender",()=>{
            this.originalBoundingRect=this.getBoundingRect();
        },this);
    }

    /**
     * @method hide
     * 
     * Hide the element.
     * 
     * 隐藏元素。
     */
    hide() {
        this.ignore = true;
        this.__topo && this.__topo.dirty();
    }

    /**
     * @method show
     * 
     * Show the element.
     * 
     * 显示元素。
     */
    show() {
        this.ignore = false;
        this.__topo && this.__topo.dirty();
    }

    /**
     * @method setClipPath
     * 
     * Set clip path dynamicly.
     * 
     * 动态设置剪裁路径。
     * 
     * @param {Path} clipPath
     */
    setClipPath(clipPath) {
        // Remove previous clip path
        if (this.clipPath && this.clipPath !== clipPath) {
            this.removeClipPath();
        }
        
        this.clipPath = clipPath;
        clipPath.__topo = this.__topo;
        clipPath.__clipTarget = this;
        clipPath.trigger("addToStorage",this.__storage);// trigger addToStorage manually
        
        //TODO: FIX this，子类 Path 中的 dirty() 方法有参数。
        this.dirty();
    }

    /**
     * @method removeClipPath
     * 
     * Remove clip path dynamicly.
     * 
     * 动态删除剪裁路径。
     */
    removeClipPath() {
        if(this.clipPath){
            this.clipPath.__topo = null;
            this.clipPath.__clipTarget = null;
            this.clipPath&&this.clipPath.trigger("delFromStorage",this.__storage);
            this.clipPath = null;
        }
    }

    /**
     * @protected
     * @method dirty
     * 
     * Mark displayable element dirty and refresh next frame.
     * 
     * 把元素标记成脏的，在下一帧中刷新。
     */
    dirty() {
        this.__dirty = this.__dirtyText = true;
        this.__boundingRect = null;
        this.__topo && this.__topo.dirty();
    }

    /**
     * @method addToStorageHandler
     * Add self to FishTopo instance.
     * Not recursively because it will be invoked when element added to storage.
     * 
     * 把当前对象添加到 FishTopo 实例中去。
     * 不会递归添加，因为当元素被添加到 storage 中的时候会执行递归操作。
     * @param {fishTopo.core.Storage} storage
     */
    addToStorageHandler(storage) {
        this.__storage = storage;
        this.__topo&&this.__topo.globalAnimationMgr.addAnimatable(this);
        this.clipPath&&this.clipPath.trigger("addToStorage",this.__storage);
        this.dirty();
    }

    /**
     * @method delFromStorageHandler
     * Remove self from FishTopo instance.
     * 
     * 把当前对象从 FishTopo 实例中删除。
     * @param {fishTopo.core.Storage} storage
     */
    delFromStorageHandler(storage) {
        this.animationProcessList.forEach((item,index)=>{
            item.trigger("stop");
        });
        this.animationProcessList=[];
        this.clipPath&&this.clipPath.trigger("delFromStorage",this.__storage);
        this.__topo=null;
        this.__storage=null;
        this.dirty();
    }

    /**
     * @protected
     * @method render
     * Callback during render.
     */
    render() {
        let ctx=this.ctx;
        let prevEl=this.prevEl;

        if(this.showTransformControls&&this.hasTransformControls){
            this.renderTransformControls();
        }

        //FIXME:refactor the render system: element self -> text -> transform controls -> link controls
        // Draw rect text
        if (this.style.text) {
            // Only restore transform when needs draw text.
            this.restoreTransform(ctx);
            this.drawRectText(ctx, this.getBoundingRect());
            this.applyTransform(ctx);
        }
    }

    renderTransformControls(){
        let ctx=this.ctx;
        let prevEl=this.prevEl;

        //draw transform controls
        this.transformControls=[];
        let positions = ['TL','T','TR','R','BR','B','BL','L','SPIN'];
        positions.forEach((p,index)=>{
            let control = new Control({
                el:this,
                name:p
            }).render();
            this.transformControls.push(control);
        });

        //draw bounding rect
        let control0=this.transformControls[0];
        let control4=this.transformControls[4];
        let p1=[control0.x3-control0.width/2,control0.y3-control0.height/2];
        let p2=[control4.x1+control4.width/2,control4.y1+control4.height/2];
        let w=p2[0]-p1[0];
        let h=p2[1]-p1[1];
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        ctx.lineWidth = control0.lineWidth;
        ctx.fillStyle = control0.fillStyle;
        ctx.strokeStyle = control0.strokeStyle;
        ctx.translate(control0.translate[0],control0.translate[1]);
        ctx.rotate(-control0.rotation);
        ctx.strokeRect(p1[0],p1[1],w,h);
        ctx.closePath();
        
        //draw connet line
        let [x1,y1,x2,y2]=[0,0,0,0];
        x1=this.transformControls[1].x1+this.transformControls[1].width/2;
        y1=this.transformControls[1].y1;
        x2=this.transformControls[8].x1+this.transformControls[8].width/2;
        y2=this.transformControls[8].y1+this.transformControls[8].height;
        ctx.beginPath();
        ctx.moveTo(x1,y1);
        ctx.lineTo(x2,y2);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * @method getBoundingRect
     * Get bounding rect of this element, NOTE: 
     * this method will return the bounding rect without transforming(translate/scale/rotate/skew). 
     * However, direct modifications to the shape property will be reflected in the bouding-rect.
     * For example,  if we modify this.shape.width directly, then the new width property will be calculated.
     * 
     * 
     * 获取当前元素的边界矩形，注意：
     * 此方法返回的是没有经过 transform(translate/scale/rotate/skew) 处理的边界矩形，但是对 shape 属性直接进行的修改会反映在获取的边界矩形上。
     * 例如，用代码直接对 this.shape.width 进行赋值，那么在计算边界矩形时就会用新的 width 属性进行计算。
     */
    getBoundingRect() {
        //All subclasses should provide implementation for this method. 
        //所有子类都需要提供此方法的具体实现。
    }

    /**
     * @protected
     * @method containPoint
     * 
     * If displayable element contain coord x, y, this is an util function for
     * determine where two elements overlap.
     * 
     * 图元是否包含坐标(x,y)，此工具方法用来判断两个图元是否重叠。
     * 
     * @param  {Number} x
     * @param  {Number} y
     * @return {Boolean}
     */
    containPoint(x, y) {
        return this.rectContainPoint(x, y);
    }

    /**
     * @protected
     * @method rectContainPoint
     * 
     * If bounding rect of element contain coord x, y.
     * 
     * 用来判断当前图元的外框矩形是否包含坐标点(x,y)。
     * 
     * @param  {Number} x
     * @param  {Number} y
     * @return {Boolean}
     */
    rectContainPoint(x, y) {
        let coord = this.globalToLocal(x, y);
        let rect = this.getBoundingRect();
        return rect.containPoint(coord[0], coord[1]);
    }

    /**
     * @method traverse
     * @param  {Function} cb
     * @param  {Object}  context
     */
    traverse(cb, context) {
        cb.call(context, this);
    }
    
    /**
     * @protected
     * @method _attrKV
     * @param {String} key
     * @param {Object} value
     */
    _attrKV(key, value) {
        if (key === 'style') {
            classUtil.copyOwnProperties(this.style,value);
        }else if (key === 'position' 
                || key === 'scale' 
                || key === 'origin'
                || key === 'skew'
                || key === 'translate') {
            let target = this[key]?this[key]:[];
            target[0] = value[0];
            target[1] = value[1];
        }else {
            this[key] = value;
        }
    }

    /**
     * @method attr
     * 
     * Modify attribute, this method will mark current object as dirty.
     * 
     * 修改对象上的属性，使用此方法修改对象上的属性会导致对象被标记成 dirty。
     * 
     * @param {String|Object} key
     * @param {*} value
     */
    attr(key, value) {
        if (dataUtil.isString(key)) {
            this._attrKV(key, value);
        }else if (dataUtil.isObject(key)) {
            for (let name in key) {
                if (key.hasOwnProperty(name)) {
                    this._attrKV(name, key[name]);
                }
            }
        }
        this.dirty();
        return this;
    }

    /**
     * @method toJSONObject
     * The subclass of Element can provide its own implementation.
     * 
     * 
     * Element 的子类可以覆盖此方法提供自己的实现。
     */
    toJSONObject(){
        let result = {
            id: this.id,
            name: this.name,
            type: this.type,
            ignore: this.ignore,
            invisible: this.invisible,
            draggable: this.draggable,
            transformable: this.transformable,
            hasTransformControls: this.hasTransformControls,
            showTransformControls: this.showTransformControls,
            position: this.position,
            shape: this.shape,
            style: this.style
        };
        return result;
    }
}

classUtil.mixin(Element, Eventful);
classUtil.mixin(Element, Animatable);
classUtil.mixin(Element, Draggable);
classUtil.mixin(Element, Transformable);
classUtil.mixin(Element, RectText);
export default Element;