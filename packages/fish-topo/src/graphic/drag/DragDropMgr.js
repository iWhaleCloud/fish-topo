/**
 * @class fishTopo.drag.DragDropMgr
 * Global drag-drop manager, hold Ctrl for multi-selection.
 * 
 * 
 * 全局拖拽管理器，支持同时拖拽多个元素，按住 Ctrl 键可以多选。
 * 
 * @author 大漠穷秋 <damoqiongqiu@126.com>
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
export default class DragDropMgr{
    /**
     * @method constructor DragDropMgr
     * @param {GlobalEventDispatcher} dispatcher 
     */
    constructor(dispatcher){
        this.dispatcher=dispatcher;
        this.selectionMap=new Map();
    }
    
    startListen(){
        this.dispatcher.on('mousedown', this.dragStart, this);
        return this;
    }

    stopListen(){
        this.clearSelectionMap();
        this._draggingItem=null;
        this._dropTarget = null;
        this._x = 0;
        this._y = 0;

        this.dispatcher.off('mousedown', this.dragStart,this);
        this.dispatcher.off('pagemousemove', this.dragging,this);
        this.dispatcher.off('pagemouseup', this.dragEnd,this);
        return this;
    }

    /**
     * @private
     * @method dragStart
     * Start dragging.
     * 
     * 
     * 开始拖动。
     * @param {Event} e 
     */
    dragStart(e) {
        let el = e.target;
        let event = e.event;
        this._draggingItem=el;

        if(!el){
            this.clearSelectionMap();
            return;
        }

        if(!el.draggable){
            return;
        }

        if(!event.ctrlKey&&!this.selectionMap.get(el.id)){
            this.clearSelectionMap();
        }
        el.dragging=true;
        this.selectionMap.set(el.id,el);
        
        this._x = e.offsetX;
        this._y = e.offsetY;
        this.dispatcher.on('pagemousemove', this.dragging, this);
        this.dispatcher.on('pagemouseup', this.dragEnd, this);

        this.selectionMap.forEach((el)=>{
            this.dispatcher.dispatchToElement(this.normalizeParam(el, e), 'dragstart', e.event);
        });
    }

    /**
     * @private
     * @method dragging
     * Dragging.
     * 
     * 
     * 拖动过程中。
     * @param {Event} e 
     */
    dragging(e) {
        let x = e.offsetX;
        let y = e.offsetY;
        let dx = x - this._x;
        let dy = y - this._y;
        this._x = x;
        this._y = y;

        this.selectionMap.forEach((el)=>{
            if(el.beforeMove(dx,dy,e,el)){
                el.move(dx, dy, e);
                el.afterMove(dx,dy,e,el)
            }
            this.dispatcher.dispatchToElement(this.normalizeParam(el, e), 'drag', e.event);
        });

        let dropTarget = this.dispatcher.findHover(x, y, this._draggingItem).target;
        let lastDropTarget = this._dropTarget;
        this._dropTarget = dropTarget;

        if (this._draggingItem !== dropTarget) {
            if (lastDropTarget && dropTarget !== lastDropTarget) {
                this.dispatcher.dispatchToElement(this.normalizeParam(lastDropTarget, e), 'dragleave', e.event);
            }
            if (dropTarget && dropTarget !== lastDropTarget) {
                this.dispatcher.dispatchToElement(this.normalizeParam(dropTarget, e), 'dragenter', e.event);
            }
        }
    }

    /**
     * @private
     * @method dragEnd
     * Drag end.
     * 
     * 
     * 拖动结束。
     * @param {Event} e 
     */
    dragEnd(e) {
        this.selectionMap.forEach((el)=>{
            el.dragging=false;
            this.dispatcher.dispatchToElement(this.normalizeParam(el, e), 'dragend', e.event);
        });
        this.dispatcher.off('pagemousemove', this.dragging,this);
        this.dispatcher.off('pagemouseup', this.dragEnd,this);

        if (this._dropTarget) {
            this.dispatcher.dispatchToElement(this.normalizeParam(this._dropTarget, e), 'drop', e.event);
        }

        this._dropTarget = null;
    }

    /**
     * @private
     * @method normalizeParam
     * @param {Element} target 
     * @param {Event} e 
     */
    normalizeParam(target, e) {
        return {target: target, topTarget: e && e.topTarget};
    }

    /**
     * @method getSelectedItems
     * Get all selected items.
     * 
     * 
     * 获取当前选中的所有元素。
     * @return {Map} selectionMap
     */
    getSelectedItems(){
        return this.selectionMap;
    }

    /**
     * @method clearSelectionMap
     * Clear all selected items.
     * 
     * 
     * 清除选中。
     */
    clearSelectionMap(){
        this.selectionMap.forEach((el)=>{el.dragging=false;});
        this.selectionMap.clear();
    }
}