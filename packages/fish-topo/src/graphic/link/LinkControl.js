import * as classUtil from '../../utils/class_util';
import * as matrixUtil from '../../utils/affine_matrix_util';
import * as vectorUtil from '../../utils/vector_util';
import Eventful from '../../event/Eventful';
import guid from '../../utils/guid';

/**
 * @class fishTopo.graphic.link.LinkControl 
 * LinkControl.
 * 
 * 
 * 连接控制器。
 * @author 大漠穷秋 <damoqiongqiu@126.com>
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
class LinkControl {
    constructor(options={}){
        this.id=guid();
        this.el = null;
        this.center = [0,0];
        this.radius = 6;
        this.name = 'START';            //START, END
        this.cursor = 'crosshair';
        this.translate=[0,0];
        this.hasTransformControls = false;
        this.lineWidth = 1;
        this.strokeStyle = '#000000';
        this.fillStyle = '#ffff00';
        this.slot=null;
        this.dragging=false;

        classUtil.inheritProperties(this,Eventful,this.options);
        classUtil.copyOwnProperties(this,options);
    }

    render(){
        let ctx=this.el.ctx;
        let param=this.calcParameters();
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.lineWidth = this.lineWidth;
        ctx.strokeStyle = this.strokeStyle;
        ctx.fillStyle = this.fillStyle;
        ctx.translate(this.translate[0],this.translate[1]);
        ctx.beginPath();
        ctx.arc(...[...param,this.radius, 0, 2 * Math.PI]);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        return this;
    }

    calcParameters(){
        this.translate=[this.el.position[0],this.el.position[1]];
        if(this.name==='START'){
            this.center=this.el.firstPoint();
        }else if(this.name==='END'){
            this.center=this.el.lastPoint();
        }
        return this.center;
    }

    isHover(x,y){
        let [centerX,centerY]=this.center;
        let points=[
            [centerX-this.radius+this.translate[0],centerY-this.radius+this.translate[1]],
            [centerX+this.radius+this.translate[0],centerY-this.radius+this.translate[1]],
            [centerX+this.radius+this.translate[0],centerY+this.radius+this.translate[1]],
            [centerX-this.radius+this.translate[0],centerY+this.radius+this.translate[1]]
        ];

        let isInsideRect = vectorUtil.isInsideRect(...points,[x,y]);
        return isInsideRect;
    }

    getGlobalPosition(){
        return matrixUtil.addVector(this.center,this.translate);
    }

    setGlobalPosition(x,y){
        let position=matrixUtil.minusVector([x,y],this.el.position);  //convert to local coordinate
        if(this.name==='START'){
            this.el.setStartPoint(...position);
        }else{
            this.el.setEndPoint(...position);
        }
        this.el.dirty();
    }

    updateGlobalPosition(){
        if(this.dragging){
            return;
        }
        if(this.name==='START'){
            this.el.setStartBounding(this.slot.el.getOuterBoundingRect());
        }else{
            this.el.setEndBounding(this.slot.el.getOuterBoundingRect());
        }
        this.setGlobalPosition(...this.slot.getGlobalPosition());
    }

    setSlot(slot){
        if(this.slot===slot){
            return;
        }
        this.slot=slot;
        
        if(this.name==='START'){
            this.el.fromId=this.slot.el.id;
            this.el.fromPosition=this.slot.name;
        }else if(this.name==='END'){
            this.el.toId=this.slot.el.id;
            this.el.toPosition=this.slot.name;
        }

        this.updateGlobalPosition();
        slot.on("afterRender",this.updateGlobalPosition,this);
    }

    deleteSlot(){
        if(this.name==='START'){
            this.el.setStartBounding(null);
            this.el.fromId='';
            this.el.fromPosition='';
        }else{
            this.el.setEndBounding(null);
            this.el.toId='';
            this.el.toPosition='';
        }
        this.slot&&this.slot.off("afterRender",this.updateGlobalPosition,this);
        this.slot=null;
    }
}

classUtil.mixin(LinkControl,Eventful);
export default LinkControl;