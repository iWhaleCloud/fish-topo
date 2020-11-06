/* eslint-disable no-unused-vars */
import * as classUtil from '../../utils/class_util';
import * as matrixUtil from '../../utils/affine_matrix_util';
import * as vectorUtil from '../../utils/vector_util';

/**
 * @class fishTopo.graphic.transform.TransformControl
 * 
 * Transform control. There are two constraints in this implementation:
 * 
 * - 1. Only support scale, rotate, skew is not supported.
 * - 2. When the element is skewed, the position of control is not right, because skew is not considered.
 * 
 * 
 * 变换控制点。目前的实现有两个限制：
 * 
 * - 1.只支持缩放、旋转，不支持斜切。
 * - 2.当元素发生斜切时，变换控制点的位置不正确，因为没有把斜切参数计算进去。
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
export default class TransformControl {
    constructor(options={}){
        this.el=null;

        // four corner points
        this.x1 = 0;
        this.y1 = 0;
        this.x2 = 0;
        this.y2 = 0;
        this.x3 = 0;
        this.y3 = 0;
        this.x4 = 0;
        this.y4 = 0;

        this.width = 20;
        this.height = 20;
        this.hasTransformControls = false;
        this.name = 'TL';   //TL, T, TR, L, R, BL, B, BR, SPIN
        this.cursor = 'corsshair';
        this.pointCache = new Map();
        this.rotation=0;
        this.translate=[0,0];
        this.scaleControlOffset=50;
        this.lineWidth = 2;
        this.fillStyle = '#00ff00';
        this.strokeStyle = '#000000';

        classUtil.copyOwnProperties(this,options);
    }

    render(){
        let ctx=this.el.ctx;
        let prevEl=this.el.prevEl;

        this._renderSquareControl(ctx,prevEl);
        return this;
    }
    
    _renderSquareControl(ctx,prevEl){
        let param=this._calcParameters();
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.lineWidth = this.lineWidth;
        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.strokeStyle;
        ctx.translate(this.translate[0],this.translate[1]);
        ctx.rotate(-this.rotation);
        ctx.strokeRect(...[...param.position,this.width,this.height]);
        ctx.closePath();
        ctx.restore();
    }

    _calcParameters(){
        let transform=this.el.transform;
        let rotation=this.el.rotation;
        let scale=this.el.scale;
        let boundingRect = this.el.getBoundingRect();
        let x=boundingRect.x1;
        let y=boundingRect.y1;
        let w=boundingRect.width;
        let h=boundingRect.height;
        let c=[w/2*scale[0],h/2*scale[1]];  //center point of bounding rect

        //step-1: cache 9 points of boundingrect, cursor style https://developer.mozilla.org/en-US/docs/Web/CSS/cursor
        this.pointCache.set("TL",{position:[0,0],cursor:'nwse-resize',name:"TL"});
        this.pointCache.set("T",{position:[w/2,0],cursor:'ns-resize',name:"T"});
        this.pointCache.set("TR",{position:[w,0],cursor:'nesw-resize',name:"TR"});
        this.pointCache.set("R",{position:[w,h/2],cursor:'ew-resize',name:"R"});
        this.pointCache.set("BR",{position:[w,h],cursor:'nwse-resize',name:"BR"});
        this.pointCache.set("B",{position:[w/2,h],cursor:'ns-resize',name:"B"});
        this.pointCache.set("BL",{position:[0,h],cursor:'nesw-resize',name:"BL"});
        this.pointCache.set("L",{position:[0,h/2],cursor:'ew-resize',name:"L"});
        this.pointCache.set("SPIN",{position:[w/2,-this.scaleControlOffset],cursor:'crosshair',name:"SPIN"});

        //step-2: calc coordinates of this control
        let sinp=0;
        let cosp=0;
        let p=null;
        let height=this.height;
        let width=this.width;
        let halfH=height/2;
        let halfW=width/2;
        
        let point=null;

        //do scale and offset for controls
        this.pointCache.forEach((point,key,map)=>{
            p=point.position;

            // apply scale to point
            p[0]=p[0]*scale[0];
            if(point.name!=='SPIN'){
                p[1]=p[1]*scale[1];
            }
            
            // move origin to the center point of boundingrect
            p[0]=p[0]-c[0];
            p[1]=p[1]-c[1];
            
            // translate, minus this.width or this.height
            sinp=matrixUtil.sinx(p[0],p[1]);
            cosp=matrixUtil.cosx(p[0],p[1]);

            if(cosp<0){
                p[0]=p[0]-width;
            }else if(cosp==0){
                p[0]=p[0]-halfW;
            }
            
            if(point.name==='SPIN'){
                if(this.el.scale[1]>0){
                    p[1]=p[1]-height;
                }else{
                    p[1]=p[1]+this.scaleControlOffset+2*height;
                }
            }else{
                if(sinp<0){
                    p[1]=p[1]-height;
                }else if(sinp==0){
                    p[1]=p[1]-halfH;
                }
            }

            //move origin back
            p[0]=p[0]+c[0];
            p[1]=p[1]+c[1];
        });

        //step-3: cache rotation and translate of this.el
        this.rotation=rotation;
        this.translate=[this.el.position[0],this.el.position[1]];

        //step-4: return result
        point=this.pointCache.get(this.name);
        this.x1=point.position[0];
        this.y1=point.position[1];
        this.x2=this.x1+this.width;
        this.y2=this.y1;
        this.x3=this.x2;
        this.y3=this.y1+this.height;
        this.x4=this.x1;
        this.y4=this.y3;
        this.cursor=point.cursor;

        return point;
    }

    isHover(x,y){
        let scale=this.el.scale;
        let m, xMin, xMax, yMin, yMax;
        let points=[[this.x1,this.y1],[this.x2,this.y2],[this.x3,this.y3],[this.x4,this.y4]];
        
        //Reverse scale because we have already considered the scale parameter when calculate the position.
        points.forEach((point,index)=>{
            point[0]=point[0]/scale[0];
            point[1]=point[1]/scale[1];
            point=this.el.localToGlobal(point[0],point[1]);
            points[index]=point;
        });

        return vectorUtil.isInsideRect(...points,[x,y]);
    }
}