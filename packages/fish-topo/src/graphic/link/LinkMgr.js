/* eslint-disable no-unused-vars */
//Because there is no static properties in ES6 now, we put the list here.
let linkables=new Map();

export default class LinkMgr{
    constructor(dispatcher){
        this.dispatcher = dispatcher;
        this.currentCable=null;              //Current dragging cable
        this.lastHoveredControl=null;
        this._cursor="crosshair";
        this._elDraggable=false;
        this._showLinkControls=false;
    }

    static registerLinkable(el){
        linkables.set(el.id,el);
    }

    static unRegisterLinkable(el){
        linkables.delete(el.id);
    }

    startListen(){
        this.dispatcher.on("mousedown",this.mouseDownHandler1,this);
        return this;
    }

    stopListen(){
        this.currentCable=null;
        this.lastHoveredControl=null;
        this._cursor="crosshair";
        this._elDraggable=false;
        this._showLinkControls=false;
        this.dispatcher.off("mousedown",this.mouseDownHandler1);
        this.dispatcher.off("mousedown",this.mouseDownHandler2);
        this.dispatcher.off("mousemove",this.mouseMoveHandler1);
        this.dispatcher.off("pagemousemove",this.mouseMoveHandler2);
        this.dispatcher.off("pagemouseup",this.mouseUpHandler);
        return this;
    }

    restoreSelection(){
        if(this.currentCable){
            this.currentCable.showLinkControls=false;
            this.currentCable.draggable=this._elDraggable;
            this.currentCable.dirty();
        }
        linkables.forEach((el,key,map)=>{
            el.trigger('linkControlHid',el);
        });
    }

    mouseDownHandler1(e){
        let el=e.target;
        if(el&&el.isCable){
            this._clickElement(el);
        }else{
            this.restoreSelection();
            this.stopListen();
            this.startListen();
        }
    }

    _clickElement(el){
        this.restoreSelection();

        this.currentCable=el;
        this._cursor=el.cursor;
        this._elDraggable=el.draggable;             //cache original draggable flag
        this._showLinkControls=el.showLinkControls=true;
        el.dirty();

        linkables.forEach((el,key,map)=>{
            el.trigger('linkControlShowed',el);
        });

        //remove mousedown listener first, then start listen to mousemove and the second mousedown event
        this.dispatcher.off("mousedown",this.mouseDownHandler1);
        this.dispatcher.on("mousemove",this.mouseMoveHandler1,this);
        this.dispatcher.on("mousedown",this.mouseDownHandler2,this);
    }

    mouseMoveHandler1(e){
        if(!this.currentCable.isCable){
            return;
        }
        let topoX = e.event.topoX;
        let topoY = e.event.topoY;
        this.lastHoveredControl=null;

        let controls=[this.currentCable.startControl,this.currentCable.endControl];
        controls.forEach((control,index)=>{
            if(control.isHover(topoX,topoY)){
                this.lastHoveredControl=control;
                this.currentCable.draggable=false;
                this.dispatcher.interceptor.setCursor(control.cursor);
            }
        });
    }

    mouseDownHandler2(e){
        let target=e.target;
        if(this.lastHoveredControl){                                            //click on a link control
            this._x=e.offsetX;
            this._y=e.offsetY;
            this.dispatcher.off("mousemove",this.mouseMoveHandler1);            //lockdown current clicked control, do not look for hovered control
            this.dispatcher.on("pagemousemove",this.mouseMoveHandler2,this);
            this.dispatcher.on("pagemouseup",this.mouseUpHandler,this);

            //disable drag-drop and transform to prevent trigger events accidentally
            this.dispatcher.disableDrag();
            this.dispatcher.disableTransform();
        }else if(target&&target.id&&target.id.indexOf("el-")!=-1){              //click on an element, FIXME:better way to determine whether the target is an element?
            this._clickElement(target);
        }else{                                                                  //click on anywhere else
            this.restoreSelection();
            this.stopListen();
            this.startListen();
        }
    }

    mouseMoveHandler2(e){
        let mouseX=e.offsetX;
        let mouseY=e.offsetY;
        this.lastHoveredControl.setGlobalPosition(mouseX,mouseY);
        this.lastHoveredControl.dragging=true;

        linkables.forEach((el,key,index)=>{
            this.lastHoveredControl.deleteSlot();
            el.trigger("linkControlDragging",el,this.lastHoveredControl);
        });
    }

    mouseUpHandler(e){
        linkables.forEach((el,key,index)=>{
            el.trigger("linkControlMouseUp",el,this.lastHoveredControl);
        });
        this.lastHoveredControl.dragging=false;

        this.currentCable.draggable=this._elDraggable;
        this.dispatcher.off("mousedown",this.mouseDownHandler1);
        this.dispatcher.off("pagemousemove",this.mouseMoveHandler2);
        this.dispatcher.off("pagemouseup",this.mouseUpHandler);
        this.dispatcher.on("mousemove",this.mouseMoveHandler1,this);
        this.dispatcher.on("mousedown",this.mouseDownHandler2,this);

        //resume drag-drop and transfrom events
        this.dispatcher.enableDrag();
        this.dispatcher.enableTransform();
    }
}