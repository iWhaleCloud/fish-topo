/* eslint-disable no-unused-vars */
import * as dataUtil from '../utils/data_structure_util';
import Element from './Element';
import Rect from './shape/Rect';

/**
 * @class fishTopo.graphic.Group
 * 
 * - Group can have child nodes, not the other Element types.
 * - The transformations applied to Group will apply to its children too.
 * 
 * - Group 可以插入子节点，其它类型不能。
 * - Group 上的变换也会被应用到子节点上。
 */
class Group extends Rect{
    /**
     * @method constructor Group
     */
    constructor(options={}){
        super(dataUtil.merge({
            style: {
                fill:'#ccc'
            }
        },options,true));

        /**
         * @property {String} type
         */
        this.type='group';

        /**
         * @property {String} resizeStrategy
         * - free: The group will not resitrict child nodes' positions, all child nodes are free to move.
         * - resize: The group will auto resize according to the position of child nodes. 
         * - restrict: The group will restrict the position of child nodes, no child nodes can move outside group area.
         * 
         * 
         * - free: Group 不会限制子节点的位置，所有子节点都可以自由移动。
         * - resize: Group 会自动调整自己的尺寸来适配子节点的位置。
         * - restrict: Group 会限制子节点的位置，子节点只能在 group 内部移动，不能超出 group 的范围。
         */
        this.resizeStrategy='resize'; // free, resize, restrict
        
        /**
         * @property children
         */
        this.children = [];

        /**
         * @private
         * @property __storage
         */
        this.__storage = null;
    }

    /**
     * @method buildPath
     * 绘制元素路径
     * @param {Object} ctx 
     * @param {String} shape 
     */
    buildPath(ctx, shape) {
        Rect.prototype.buildPath.call(this,ctx,shape);
    }

    /**
     * @method add
     * 添加子节点到最后
     * @param {Element} child
     */
    add(child) {
        if (child 
            && child !== this 
            && child.parent !== this) {
            this._doAdd(child);
        }
        return this;
    }

    /**
     * @method addBefore
     * 添加子节点在 nextSibling 之前
     * @param {Element} child
     * @param {Element} nextSibling
     */
    addBefore(child, nextSibling) {
        if (child 
            && child !== this 
            && child.parent !== this
            && nextSibling 
            && nextSibling.parent === this) {
            
            let children = this.children;
            let idx = children.indexOf(nextSibling);
            if (idx >= 0) {
                children.splice(idx, 0, child);
                this._doAdd(child);
            }
        }
        return this;
    }

    /**
     * @private
     * @method _doAdd
     * @param {*} child 
     */
    _doAdd(child) {
        child.parent&&child.parent.remove(child);
        child.parent=this;
        this.children.push(child);
        this.__topo&&(child.__topo=this.__topo);
        this.__storage&&this.__storage.addToStorage(child);

        //listen to moving and resizing evnets.
        child.beforeMove=this.beforeChildMove;
        child.on("moving",this.childEventHandler,this);
        child.on("resizing",this.childEventHandler,this);
    }

    childEventHandler(child){
        if(this.resizeStrategy==='free'){
            return;
        }else if(this.resizeStrategy==='resize'){
            this.resizeGroup(child);
        }
    }

    //执行上下文是子元素对象
    beforeChildMove(dx,dy,event){
        let group=this.parent;
        if(group.resizeStrategy==='free'){
            return true;
        }

        let groupOriginalRect=group.originalBoundingRect;
        let groupRect=group.getOuterBoundingRect();
        let childRect=this.getOuterBoundingRect();

        if(this.position[0]<0){
            this.position[0]=0;
            return false;
        }
        if(this.position[1]<0){
            this.position[1]=0;
            return false;
        }
        
        if(group.resizeStrategy==='restrict'){
            let tempWidth=childRect.x2-groupRect.x1;
            if(tempWidth>groupOriginalRect.width){
                this.position[0]=groupOriginalRect.width-childRect.width;
                return false;
            }

            let tempHeight=childRect.y2-groupRect.y1;
            if(tempHeight>groupOriginalRect.height){
                this.position[1]=groupOriginalRect.height-childRect.height;
                return false;
            }
        }
        return true;
    }

    resizeGroup(child){
        let groupOriginalRect=this.originalBoundingRect;
        let groupRect=this.getOuterBoundingRect();
        let childRect=child.getOuterBoundingRect();
        let newWidth=groupOriginalRect.width;
        let newHeight=groupOriginalRect.height;

        if(child.position[0]>=0){
            let temp=childRect.x2-groupRect.x1;
            if(temp>groupOriginalRect.width){
                newWidth=temp;
            }
        }

        if(child.position[1]>=0){
            let temp=childRect.y2-groupRect.y1;
            if(temp>groupOriginalRect.height){
                newHeight=temp;
            }
        }

        this.shape.width=newWidth;
        this.shape.height=newHeight;

        this.dirty();
        this.trigger("resizing",this);
    }

    /**
     * @method remove
     * 移除子节点
     * @param {Element} child
     */
    remove(child) {
        child.beforeMove=null;
        child.off("moving",this.childEventHandler,this);
        child.off("resizing",this.childEventHandler,this);

        let idx = dataUtil.indexOf(this.children, child);
        if (idx >= 0) {
            this.children.splice(idx, 1);
            this.__storage&&this.__storage.delFromStorage(child);
        }
        return this;
    }

    /**
     * @method removeAll
     * 移除所有子节点
     */
    removeAll() {
        let storage = this.__storage;
        this.children.forEach((child,index)=>{
            storage&&storage.delFromStorage(child);
            child.parent = null;
        });
        this.children.length = 0;
        return this;
    }

    /**
     * @method eachChild
     * 遍历所有子节点
     * @param  {Function} cb
     * @param  {Object}   context
     */
    eachChild(cb, context) {
        this.children.forEach((child,index)=>{
            cb.call(context,child);
        });
        return this;
    }

    /**
     * @method traverse
     * 深度优先遍历所有子孙节点
     * @param  {Function} cb
     * @param  {Object}   context
     */
    traverse(cb, context) {
        this.children.forEach((child,index)=>{
            cb.call(context,child);
            if (child.type === 'group') {
                child.traverse(cb, context);
            }
        });
        return this;
    }

    /**
     * @method addToStorage
     * Override addToStorage method of super class.
     * @param {fishTopo.core.Storage} storage 
     */
    addToStorageHandler(storage) {
        //首先把子元素添加到 storage
        this.children.forEach((child,index)=>{
            child.parent=this;
            child.__topo=this.__topo;
            storage.addToStorage(child);
        });
        //然后在调用父层的处理函数添加自身
        Element.prototype.addToStorageHandler.call(this,storage);
    }

    /**
     * @method delFromStorageHandler
     * Override delFromStorageHandler method of super class.
     * @param {fishTopo.core.Storage} storage 
     */
    delFromStorageHandler(storage) {
        //首先把子元素从 storage 中删除
        this.children.forEach((child,index)=>{
            child.parent=null;
            storage.delFromStorage(child);
        });
        //然后在调用父层的处理函数删除自身
        Element.prototype.delFromStorageHandler.call(this,storage);
    }

    toJSONObject(){
        let result=Element.prototype.toJSONObject.call(this);
        result.linkable=this.linkable;
        result.children=[];
        this.children.forEach((child,index)=>{
            result.children.push(child.toJSONObject());
        });
        return result;
    }

    // /**FIXME:refactor this method
    //  * @method getBoundingRect
    //  * @return {BoundingRect}
    //  */
    // getBoundingRect(includeChildren) {
    //     // TODO Caching
    //     let rect = null;
    //     let tmpRect = new BoundingRect(0, 0, 0, 0);
    //     let children = includeChildren || this.children;
        
    //     for (let i = 0; i < children.length; i++) {
    //         let child = children[i];
    //         if (child.ignore || child.invisible) {
    //             continue;
    //         }

    //         let childRect = child.getBoundingRect();
    //         let transform = child.getLocalTransform();
    //         // TODO:
    //         // The boundingRect cacluated by transforming original
    //         // rect may be bigger than the actual bundingRect when rotation
    //         // is used. (Consider a circle rotated aginst its center, where
    //         // the actual boundingRect should be the same as that not be
    //         // rotated.) But we can not find better approach to calculate
    //         // actual boundingRect yet, considering performance.
    //         if (transform) {
    //             tmpRect.copy(childRect);
    //             tmpRect.applyTransform(transform);
    //             rect = rect || tmpRect.clone();
    //             rect.union(tmpRect);
    //         }else {
    //             rect = rect || childRect.clone();
    //             rect.union(childRect);
    //         }
    //     }
    //     return rect || tmpRect;
    // }
}

export default Group;