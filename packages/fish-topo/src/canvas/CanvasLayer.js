import * as canvasUtil from '../utils/canvas_util';
import Style from '../graphic/Style';
import Pattern from '../graphic/Pattern';
import guid from '../utils/guid';

/**
 * @class fishTopo.canvas.CanvasLayer
 * 
 * CanvasLayer is designed to create canvas layers, it will be used in CanvasPainter.
 * CanvasPainter will create several canvas instances during the paint process, some 
 * of them are invisiable, such as the one used for export a image. There is at least one 
 * canvas layer in the whole system.
 * Attention: we can NOT create canvas dynamicly in Wechat mini-program, because Wechat
 * does not allow us to manipulate DOM.
 * 
 * 该类被设计用来创建 canvas 层，在 CanvasPainter 类中会引用此类。
 * 在绘图过程中， CanvasPainter 会创建多个 canvas 实例来辅助操作，
 * 某些 canvas 实例是隐藏的，比如用来导出图片的 canvas。
 * 在整个系统中至少有一个 canvas 层。
 * 注意：在微信小程序中不能动态创建 canvas 标签，因为微信小程序不允许 DOM 操作。
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

export default class CanvasLayer{
    /**
     * @method constructor CanvasLayer
     * @param {HTMLDomElement|Canvas|Context} host 
     * This can be a HTMLDomElement like a DIV, or a Canvas instance, 
     * or Context for Wechat mini-program.
     * 
     * 此属性可以是 HTMLDomElement ，比如 DIV 标签；也可以是 Canvas 实例；或者是 Context 实例，因为在某些
     * 运行环境中，不能获得 Canvas 实例的引用，只能获得 Context。
     * @param {Number} width
     * @param {Number} height
     * @param {Number} [dpr]
     */
    constructor(host,width,height,dpr){
        /**
         * @property {String} id
         */
        this.id = guid();

        /**
         * @property {Number} width
         */
        this.width=width;
        
        /**
         * @property {Number} height
         */
        this.height=height;
        
        /**
         * @property {Number} dpr
         */
        this.dpr = dpr;
        
        /**
         * @property {Context} ctx 
         * Canvas context, this property will be initialized after calling initContext() method.
         * This property will be null before initializing.
         * 
         * Canvas 绘图上下文，此属性在调用 initContext() 方法之后初始化，初始化之前此属性为 null。
         */
        this.ctx;

        // Create or set canvas instance.
        let canvasInstance=null;
        if (host&&host.nodeName&&host.nodeName.toUpperCase() === 'CANVAS') {// host is a canvas instance
            canvasInstance = host;
            this.id = canvasInstance.id;
        }else if(typeof host === 'string'){// host is an id string
            canvasInstance = canvasUtil.createCanvas(host,this.width,this.height,this.dpr);
            this.id=host;
        }else{// host is a Context instance
            this.ctx=host;
        }
        // There is no style attribute of canvasInstance in nodejs.
        if (canvasInstance&&canvasInstance.style) {
            canvasInstance.onselectstart = ()=>{return false;}; // 避免页面选中的尴尬
            canvasInstance.style['-webkit-user-select'] = 'none';
            canvasInstance.style['user-select'] = 'none';
            canvasInstance.style['-webkit-touch-callout'] = 'none';
            canvasInstance.style['-webkit-tap-highlight-color'] = 'rgba(0,0,0,0)';
            canvasInstance.style['padding'] = 0; // eslint-disable-line dot-notation
            canvasInstance.style['margin'] = 0; // eslint-disable-line dot-notation
            canvasInstance.style['border-width'] = 0;
        }

        /**
         * @property {Canvas} canvasInstance
         * Note: this property may be null because under some circumstances we can't get the canvas instance but Context instance. 
         * 
         * 
         * 注意：this.canvasInstance 可能为null，因为在某些环境下，比如微信小程序中，没有办法获取 canvas 实例，只能获取到 Context 对象。
         */
        this.canvasInstance = canvasInstance;

        /**
         * @property {Canvas} hiddenCanvas 
         * A hidden canvas instance, we will use this to do some operations under some circumstances.
         * 
         * 
         * 隐藏的画布实例，在某些情况下会用隐藏的画布来进行一些操作。
         */
        this.hiddenCanvas = null;

        /**
         * @property {Context} hiddenContext 
         * The hidden canvas context.
         * 
         * 
         * 隐藏的画布上下文。
         */
        this.hiddenContext = null;

        
        this.config = null;

        /**
         * @property {String} clearColor
         * The default color for the empty canvas.
         * 
         * 
         * 空画布的默认颜色。
         */
        this.clearColor = 0;

        /**
         * @property {Boolean} motionBlur
         * Wether to open the monion blur.
         * 
         * 
         * 是否开启动态模糊。
         */
        this.motionBlur = false;
        
        /**
         * @property {Number} lastFrameAlpha
         * This property is valid when this.motionBlur is true, the alpha value mixed with previous frame.
         * The larger the value, the more obvious the wake.
         * 
         * 
         * 在开启动态模糊的时候使用，与上一帧混合的 alpha 值，值越大尾迹越明显。
         */
        this.lastFrameAlpha = 0.7;
        
        /**
         * @property {Boolean} incremental
         * Wether to use incremental rendering, if incremental is true, the canvas will not be cleared before rendering.
         * 
         * 
         * 是否启用增量渲染，启用增量渲染的时候，在绘制每一帧之前都不会清空画布。
         */
        this.incremental=false;

        this.__dirty=true;
        this.__used=false;
        this.__drawIndex=0;
        this.__startIndex=0;
        this.__endIndex=0;
    }
    
    /**
     * @method getElementCount
     */
    getElementCount() {
        return this.__endIndex - this.__startIndex;
    }

    /**
     * @method initContext
     */
    initContext() {
        if(this.canvasInstance){
            this.ctx = canvasUtil.getContext(this.canvasInstance);
        }
        this.ctx.dpr = this.dpr;
    }

    /**
     * @method creatHiddenCanvas
     */
    creatHiddenCanvas() {
        this.hiddenCanvas = canvasUtil.createCanvas('back-' + this.id, this.width,this.height, this.dpr);
        this.hiddenContext = canvasUtil.getContext(this.hiddenCanvas);
        if (this.dpr !== 1) {
            this.hiddenContext.scale(this.dpr, this.dpr);
        }
    }

    /**
     * @method resize
     * @param  {Number} width
     * @param  {Number} height
     */
    resize(width, height) {
        //Can NOT get canvas instance in Wechat mini-program.
        if(!this.canvasInstance){
            return;
        }
        if (this.canvasInstance.style) {
            this.canvasInstance.style.width = width + 'px';
            this.canvasInstance.style.height = height + 'px';
        }
        this.canvasInstance.width = width * this.dpr;
        this.canvasInstance.height = height * this.dpr;

        if (!this.hiddenCanvas) {
            return;
        }
        this.hiddenCanvas.width = width * this.dpr;
        this.hiddenCanvas.height = height * this.dpr;
        if (this.dpr !== 1) {
            this.hiddenContext.scale(this.dpr, this.dpr);
        }
    }

    /**
     * @method clear
     * Clear the canvas.
     * 
     * 
     * 清空该层画布。
     * @param {Boolean} [clearAll=false] Clear all with out motion blur
     * @param {Color} [clearColor]
     */
    clear(clearAll, clearColor) {
        clearColor = clearColor || this.clearColor;        
        let haveMotionBLur = this.motionBlur && !clearAll;
        let lastFrameAlpha = this.lastFrameAlpha;
        let dpr = this.dpr;
        let width=0;
        let height=0;
        let ctx = this.ctx;

        if (haveMotionBLur&&this.canvasInstance) {
            width = this.canvasInstance.width;
            height = this.canvasInstance.height;
            if (!this.hiddenCanvas) {
                this.creatHiddenCanvas();
            }
            this.hiddenContext.globalCompositeOperation = 'copy';
            this.hiddenContext.drawImage(
                this.canvasInstance, 0, 0,
                width / dpr,
                height / dpr
            );
        }
        
        if (this.canvasInstance) {
            ctx.clearRect(0, 0, this.canvasInstance.width, this.canvasInstance.height);
        } else {
            ctx.clearRect(0, 0, this.width, this.height);
        }

        
        if (clearColor && clearColor !== 'transparent') {
            let clearColorGradientOrPattern;
            // Gradient
            if (clearColor.colorStops) {
                // Cache canvasInstance gradient
                clearColorGradientOrPattern = clearColor.__canvasGradient || Style.getGradient(ctx, clearColor, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height
                });
                clearColor.__canvasGradient = clearColorGradientOrPattern;
            }else if (clearColor.image) {// Pattern
                clearColorGradientOrPattern = Pattern.prototype.getCanvasPattern.call(clearColor, ctx);
            }
            ctx.save();
            ctx.fillStyle = clearColorGradientOrPattern || clearColor;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        if (haveMotionBLur&&this.hiddenCanvas) {
            ctx.save();
            ctx.globalAlpha = lastFrameAlpha;
            ctx.drawImage(this.hiddenCanvas, 0, 0, width, height);
            ctx.restore();
        }
    }
}
