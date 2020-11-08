/* eslint-disable no-unused-vars */
import * as vectorUtil from '../../utils/vector_util';

/**
 * @abstract
 * @class fishTopo.drag.Draggable
 * 
 * 
 * 
 * 提供拖拽功能，所有需要拖拽功能的元素都可以混入此类的实现。此实现依赖事件机制，混入此实现的类需要预先混入 eventful 接口。
 * @author 大漠穷秋 <damoqiongqiu@126.com>
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
let Draggable = function () {
    /**
     * @property {Boolean} draggable
     * Whether it can be dragged.
     */
    this.draggable = false;

    /**
     * @property {Boolean} dragging
     * Whether is it dragging.
     */
    this.dragging = false;
}

Draggable.prototype={
    constructor:Draggable,

    /**
     * @method beforeMove
     * 
     * 
     * 
     * 钩子函数，在元素发生移动之前执行。
     * 如果 beforeMove 返回 false ，元素不会发生移动，API 调用者可以利用此钩子实现复杂的控制。
     */
    beforeMove(dx,dy,event,el){
        return true;
    },

    /**
     * @method move
     * 
     * Move element
     * 
     * 移动元素
     * 
     * @param  {Number} dx dx on the global space.
     * @param  {Number} dy dy on the global space.
     * @param  {Event} event event object.
     */
    move(dx, dy, event) {
        this.trigger("beforeMove",this);
        switch (this.draggable) {
            case 'horizontal':
                dy = 0;
                break;
            case 'vertical':
                dx = 0;
                break;
        }
        this.trigger("moving",this);//TODO:trigger moving event when animating the position property.
        vectorUtil.add(this.position,this.position,[dx,dy]);
        this.dirty();
        this.trigger("afterMove",this);
        this.afterMove();
    },

    /**
     * @method afterMove
     * 钩子函数，在元素发生移动之后执行。
     */
    afterMove(dx, dy, event, el){

    }
}

export default Draggable;