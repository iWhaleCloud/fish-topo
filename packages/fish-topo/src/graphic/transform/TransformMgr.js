/* eslint-disable no-unused-vars */
import {mathAbs} from '../../utils/constants';
import * as matrixUtil from '../../utils/affine_matrix_util';

/**
 * @class fishTopo.graphic.transform.TransformMgr
 * 
 * Global transform manager. When user drag the transform control and begin dragging, this manager will handle the events
 * and transform parameters for the selected element.
 * 
 * 全局变换管理器。当用户选中元素，开始拖动变换控制器时，此管理器负责处理事件、重新计算选中元素上的各项参数。
 */
export default class TransformMgr{
    constructor(dispatcher){
        this.dispatcher=dispatcher;
    }
    
    startListen(){
        this.stopListen();
        this.dispatcher.on("mousedown",this.mouseDownHandler1,this);
        return this;
    }

    stopListen(){
        this._restoreSelection();   //incase there was a selected element
        this.selectedEl=null;
        this.lastHoveredControl=null;
        this._x=0;                  //cache x axis
        this._y=0;                  //cache y axis
        this._center=[0,0];         //cache center point of bounding rect
        this._position;
        this._scale;
        this._rotation;
        this._width;
        this._height;
        this._transform;
        this._cursor='default';     //cache cursor type
        this._elDraggable=false;    //cache original draggable flag of element
        this._hasControls=false;    //whether this.el has controls
        
        //remove all event listeners
        this.dispatcher.off("mousedown",this.mouseDownHandler1,this);
        this.dispatcher.off("mousedown",this.mouseDownHandler2,this);
        this.dispatcher.off("mousemove",this.mouseMoveHandler1,this);
        this.dispatcher.off("pagemousemove",this.mouseMoveHandler2,this);
        this.dispatcher.off("pagemouseup",this.mouseUpHandler,this);

        return this;
    }

    mouseDownHandler1(e){
        let el=e.target;
        if(el&&el.transformable){//click on an element
            this._clickElement(el);
        }else{//no element is clicked
            this.startListen();
        }
    }

    _clickElement(el){
        this._restoreSelection();
        this.selectedEl=el;
        this._cursor=el.cursor;
        this._elDraggable=el.draggable;             //cache original draggable flag
        this._hasControls=el.hasTransformControls=true;
        el.dirty();

        //remove mousedown listener first, then start listen to mousemove 
        //and the second mousedown event
        this.dispatcher.off("mousedown",this.mouseDownHandler1,this);
        this.dispatcher.on("mousemove",this.mouseMoveHandler1,this);
        this.dispatcher.on("mousedown",this.mouseDownHandler2,this);
    }

    _restoreSelection(){
        if(this.selectedEl){
            //restore original draggable flag
            this.selectedEl.draggable=this._elDraggable;
            this.selectedEl.hasTransformControls=false;
            this.selectedEl.dirty();
        }
    }

    mouseMoveHandler1(e){
        if(!this.selectedEl){
            return;
        }
        let topoX = e.event.topoX;
        let topoY = e.event.topoY;
        this.lastHoveredControl=null;
        this.selectedEl.transformControls.forEach((control,index)=>{
            if(control.isHover(topoX,topoY)){
                this.lastHoveredControl=control;
                this.dispatcher.interceptor.setCursor(control.cursor);
            }
        });
    }

    mouseDownHandler2(e){
        let target=e.target;
        if(this.lastHoveredControl){                                    //click on a transform control
            this.selectedEl.draggable=false;
            this._x=e.offsetX;
            this._y=e.offsetY;
            this.dispatcher.off("mousemove",this.mouseMoveHandler1,this);    //lockdown current clicked control, do not look for hovered control
            this.dispatcher.on("pagemousemove",this.mouseMoveHandler2,this);
            this.dispatcher.on("pagemouseup",this.mouseUpHandler,this);
        }else if(target&&target.id&&target.id.indexOf("el-")!=-1){      //click on an element, FIXME:better way to determine whether the target is an element?
            this._clickElement(target);
        }else{                                                          //click on anywhere else
            this._hasControls=false;
            this.startListen();
        }
    }

    mouseMoveHandler2(e){
        let mouseX=e.offsetX;    //x position of mouse in global space
        let mouseY=e.offsetY;    //y position of mouse in global space
        let name=this.lastHoveredControl.name;
        if(name==='SPIN'){
            this.handleRotate(mouseX,mouseY);
        }else{
            this.handleScale(mouseX,mouseY);
        }
    }

    handleRotate(mouseX,mouseY){
        let bps=this.getTransformedBoundingRect();
        [mouseX,mouseY]=matrixUtil.minusVector([mouseX,mouseY],this._center);
        let sinp=matrixUtil.sinx(...[mouseX,mouseY]);
        let cosp=matrixUtil.cosx(...[mouseX,mouseY]);
        let radian=Math.asin(Math.abs(sinp));
        
        if(sinp>=0){
            if(cosp<0){
                radian=Math.PI-radian;
            }
            if(this._scale[1]>0){   //flip in Y direction
                radian=radian+Math.PI;
            }
            radian=radian-Math.PI/2;
        }else{
            radian=-radian;
            if(cosp<0){
                radian=-(Math.PI+radian);
            }
            if(this._scale[1]<0){   //flip in Y direction
                radian=radian+Math.PI;
            }
            radian=radian+Math.PI/2;
        }
        
        let position=bps[0];
        position=matrixUtil.rotateVector(position,-radian);
        position=matrixUtil.addVector(position,this._center);

        this.selectedEl.position=position;
        this.selectedEl.rotation=-radian;
        this.selectedEl.dirty();
    }

    handleScale(mouseX,mouseY){
        let bps=this.getTransformedBoundingRect();
        let [tmx,tmy]=this.transformMousePoint(mouseX,mouseY);
        let newSx=mathAbs(tmx/(this._width/2));
        let newSy=mathAbs(tmy/(this._height/2));

        let name=this.lastHoveredControl.name;
        if(name.indexOf("T")!=-1){
            newSy=(tmy>=0?-newSy:newSy);
        }else if(name.indexOf("B")!=-1){
            newSy=(tmy>=0?newSy:-newSy);
        }else{
            newSy=this._scale[1];
        }

        if(name.indexOf("L")!=-1){
            newSx=(tmx>=0?-newSx:newSx);
        }else if(name.indexOf("R")!=-1){
            newSx=(tmx>=0?newSx:-newSx);
        }else{
            newSx=this._scale[0];
        }

        let position=bps[0];
        if(name.indexOf("R")!=-1){
            position[0]=-tmx;
        }else if(name.indexOf("L")!=-1){
            position[0]=tmx;
        }
        if(name.indexOf("B")!=-1){
            position[1]=-tmy;
        }else if(name.indexOf("T")!=-1){
            position[1]=tmy;
        }

        position=matrixUtil.rotateVector(position,this._rotation);
        position=matrixUtil.addVector(position,this._center);
        this.selectedEl.position=position;
        this.selectedEl.scale=[newSx,newSy];
        this.selectedEl.dirty();
    }

    mouseUpHandler(e){
        this.selectedEl.draggable=this._elDraggable;
        this.dispatcher.off("mousedown",this.mouseDownHandler1,this);
        this.dispatcher.off("pagemousemove",this.mouseMoveHandler2,this);
        this.dispatcher.off("pagemouseup",this.mouseUpHandler,this);
        this.dispatcher.on("mousemove",this.mouseMoveHandler1,this);
        this.dispatcher.on("mousedown",this.mouseDownHandler2,this);
    }

    /**
     * @private
     * @method getTransformedBoundingRect
     * Get transformed bouding rect of selected element, including four corner points, center point of original bounding rect, 
     * and rotate control point. The coordinates returned by this method are in global space, the coordinate is based on the 
     * center of bounding rect.
     * 
     * 
     * 获取变换之后的边界矩形坐标，包括：4个角落上的坐标点、中心坐标点、旋转控制器的坐标点。此方法返回的坐标位于全局空间中，计算的
     * 坐标原点在边界矩形的中心点上。
     */
    getTransformedBoundingRect(){
        this._position=this.selectedEl.position;                //current position in global space
        this._scale=this.selectedEl.scale;                      //current scale in global space
        this._width=this.selectedEl.shape.width                 //original width without transforming
                    ||this.selectedEl.style.width;              
        this._height=this.selectedEl.shape.height               //original height without transforming
                    ||this.selectedEl.style.height;             
        this._rotation=this.selectedEl.rotation;                //current rotation in global space
        this._center=[this._width/2,this._height/2];            //original centerpoint in local space

        let m=matrixUtil.create();
        m=matrixUtil.scale(m,this._scale);
        m=matrixUtil.rotate(m,this._rotation);
        m=matrixUtil.translate(m,this._position);
        this._transform=m;
        this._center=matrixUtil.transformVector(this._center,this._transform);  //center point in global space

        let p0=[0,0];
        let p1=[this._width,0];
        let p2=[this._width,this._height];
        let p3=[0,this._height];
        let p4=[this._width/2,-50];
        
        // covert coordinate to global space
        p0=matrixUtil.transformVector(p0,this._transform);
        p1=matrixUtil.transformVector(p1,this._transform);
        p2=matrixUtil.transformVector(p2,this._transform);
        p3=matrixUtil.transformVector(p3,this._transform);
        p4=matrixUtil.transformVector(p4,this._transform);

        // move origin to this._center point
        p0=matrixUtil.minusVector(p0,this._center);
        p1=matrixUtil.minusVector(p1,this._center);
        p2=matrixUtil.minusVector(p2,this._center);
        p3=matrixUtil.minusVector(p3,this._center);
        p4=matrixUtil.minusVector(p4,this._center);

        // rotate with element's rotation
        p0=matrixUtil.rotateVector(p0,-this._rotation);
        p1=matrixUtil.rotateVector(p1,-this._rotation);
        p2=matrixUtil.rotateVector(p2,-this._rotation);
        p3=matrixUtil.rotateVector(p3,-this._rotation);
        p4=matrixUtil.rotateVector(p4,-this._rotation);

        return [p0,p1,p2,p3,p4,this._center];
    }

    /**
     * @private
     * @method transformMousePoint
     * Transform the cursor origin to the center point of bounding rect, then rotate the same angel as the element does.
     * 
     * 
     * 把光标的原点变换到边界矩形的中心点，并与元素保持相同的旋转角。
     * 
     * @param {*} x 
     * @param {*} y 
     */
    transformMousePoint(x,y){
        [x,y]=matrixUtil.minusVector([x,y],this._center);
        [x,y]=matrixUtil.rotateVector([x,y],-this._rotation);//为什么这里的旋转是反向的？
        return [x,y];
    }
}