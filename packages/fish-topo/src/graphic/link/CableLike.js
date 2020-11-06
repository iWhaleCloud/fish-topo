import LinkControl from './LinkControl';
import * as matrixUtil from '../../utils/affine_matrix_util';
import {mathSin, mathCos} from '../../utils/constants';

/**
 * @abstract
 * @class fishTopo.graphic.link.CableLike
 * This is an abstract class, anything want to work like a cable can mixin this implementation.
 * To implement some complex scenarios in the future, here are the things need to be noted:
 * - CableLike is always drawn in global space.
 * - CableLike can translate, but can NOT scale, rotate, skew. 
 * - CableLink always has two endpoints, even polyline can't have any more.
 * - CableLink does NOT belong to any group.
 * - The class mixed-in this implementation is assumed mixed-in Eventful because we need event system.
 * 
 * 
 * 连接线抽象类，需要成为连接线的类都可以混入此抽象类的实现。
 * 为了方便实现一些复杂的连接场景，特别注意：
 * - 连接线总是画在全局坐标系中。
 * - 连接线可以移动位置，但不能缩放、旋转、斜切。
 * - 连接线只有两个端点，即使是折线，也是两个端点，不会有更多。
 * - 连线不属于任何分组。
 * - 混入此实现的类默认假定已经混入了 Eventful ，因为我们需要事件系统。
 */
function CableLike(){
    this.isCable=false;
    this.showLinkControls = false;
    this.startBounding = null;      // bounding rect of start shape
    this.endBounding = null;        // bounding rect of end shape
    this.arrowType = 'both';        // end, start, both
    this.arrowAngel = Math.PI/8;
    this.arrowLength = 10;

    this.fromId = '';           // ID of start element.
    this.toId = '';             // ID of end element.
    this.fromPosition = '';     // link position of start element
    this.toPosition= '';        // link position of end element

    this.startControl = new LinkControl({
        el:this,
        name:'START'
    });

    this.endControl = new LinkControl({
        el:this,
        name:'END'
    });

    this.on("afterRender",this.afterRenderHandler,this);
}

CableLike.prototype={
    constructor:CableLike,

    afterRenderHandler:function(){
        if(!this.isCable){
            return;
        }
        if(this.arrowType==='start'||this.arrowType==='both'){
            this.renderStartArrow();
        }
        if(this.arrowType==='end'||this.arrowType==='both'){
            this.renderEndArrow();
        }
        if(this.showLinkControls){
            this.renderLinkControls();
        }
        this.startControl.trigger("afterRender",this.startControl);
        this.endControl.trigger("afterRender",this.endControl);
    },

    /**
     * @protected
     * @method renderTransformControls
     */
    renderLinkControls:function(){
        this.startControl.render();
        this.endControl.render();
    },

    renderStartArrow:function(){
        let firstTwoPoints=this.firstTwoPoints();
        this.__doRenderArrow(firstTwoPoints);
    },

    renderEndArrow:function(){
        let lastTwoPoints=this.lastTwoPoints();
        this.__doRenderArrow(lastTwoPoints);
    },

    __doRenderArrow:function(twoPoints){
        let p1=twoPoints[0];
        let p2=twoPoints[1];

        //step-1: move origin to end point
        p2[0]=p2[0]-p1[0];
        p2[1]=p2[1]-p1[1];

        //step-2: cosp2 and sinp2
        let cosp2=matrixUtil.cosx(...p2);
        let sinp2=matrixUtil.sinx(...p2);

        let cosArrow=mathCos(this.arrowAngel);
        let sinArrow=mathSin(this.arrowAngel);

        let x1=this.arrowLength*(cosp2*cosArrow-sinp2*sinArrow);
        let y1=this.arrowLength*(sinp2*cosArrow+cosp2*sinArrow);

        let x2=this.arrowLength*(cosp2*cosArrow+sinp2*sinArrow);
        let y2=this.arrowLength*(sinp2*cosArrow-cosp2*sinArrow);

        //step-3: move origin back to (0,0)
        x1+=p1[0];
        y1+=p1[1];

        x2+=p1[0];
        y2+=p1[1];

        //step-4: draw arrow
        this.ctx.save();
        this.ctx.strokeStyle=this.style.stroke;
        this.ctx.fillStyle=this.style.stroke;
        this.ctx.beginPath();
        this.ctx.moveTo(...p1);
        this.ctx.lineTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.fill();
        this.ctx.restore();
    },

    setStartBounding(startBounding){
        this.startBounding=startBounding;
    },

    setEndBounding(endBounding){
        this.endBounding=endBounding;
    }
}

export default CableLike;