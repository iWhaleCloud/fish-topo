import * as dataUtil from '../utils/data_structure_util';
import * as classUtil from '../utils/class_util';
import * as vectorUtil from '../utils/vector_util';
import * as eventTool from '../utils/event_util';
import Eventful from './Eventful';
import DragDropMgr from '../graphic/drag/DragDropMgr';
import TransformEventMgr from '../graphic/transform/TransformMgr';
import LinkMgr from '../graphic/link/LinkMgr';
import GestureMgr from './GestureMgr';

/**
 * @class fishTopo.event.GlobalEventDispatcher
 * There is no build-in event system inside canvas, so we need GlobalEventDispatcher to provide these functions.
 * The implementation here is consistent with W3C DOM event. The core idea of GlobalEventDispatcher is dispathing 
 * the mouse, keyboard, and touch events intercepted by DomEventInterceptor to the elements inside canvas.
 * 
 * 
 * Canvas API 没有提供画布内部的事件系统， GlobalEventDispatcher 用来封装画布内部元素的事件处理逻辑。
 * 此实现的整体概念模型与 W3C 定义的 DOM 事件系统一致。GlobalEventDispatcher 的核心处理逻辑是：
 * 把 DomEventInterceptor 所拦截到的鼠标、键盘、触摸事件派发给 canvas 内部的元素。
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

/**
 * @private
 * @method makeEventPacket
 * @param {String} eveType 
 * @param {Object} targetInfo 
 * @param {Event} event 
 */
function makeEventPacket(eveType, targetInfo, event) {
    return {
        type: eveType,
        event: event,
        // target can only be an element that is not silent.
        target: targetInfo.target,
        // topTarget can be a silent element.
        topTarget: targetInfo.topTarget,
        cancelBubble: false,
        offsetX: event.topoX,
        offsetY: event.topoY,
        gestureEvent: event.gestureEvent,
        pinchX: event.pinchX,
        pinchY: event.pinchY,
        pinchScale: event.pinchScale,
        wheelDelta: event.topoDelta,
        topoByTouch: event.topoByTouch,
        topoIsFromLocal: event.topoIsFromLocal,
        which: event.which,
        stop: stopEvent
    };
}

/**
 * @private
 * @method
 */
function stopEvent() {
    eventTool.stop(this.event);
}

function EmptyInterceptor() {}
EmptyInterceptor.prototype.dispose = function () {};

let handlerNames = [
    'click', 'dblclick', 'mousewheel', 'mouseout',
    'mouseup', 'mousedown', 'mousemove', 'contextmenu',
    'pagemousemove', 'pagemouseup',
    'pagekeydown','pagekeyup'
];

/**
 * @method pageEventHandler
 * 监听页面上触发的事件，转换成当前实例自己触发的事件。
 * @param {String} pageEventName 
 * @param {Event} event 
 */
function pageEventHandler(pageEventName, event) {
    this.trigger(pageEventName, makeEventPacket(pageEventName, {}, event));
}

/**
 * @method isHover
 * 鼠标是否在指定的元素上方。
 * @param {Element} element 
 * @param {Number} x 
 * @param {Number} y 
 */
function isHover(element, x, y) {
    if (element[element.rectHover ? 'rectContainPoint' : 'containPoint'](x, y)) {
        let el = element;
        let isSilent = false;
        while (el) {
            // If clipped by ancestor.
            // FIXME: If clipPath has neither stroke nor fill,
            // el.clipPath.containPoint(x, y) will always return false.
            if (el.clipPath && !el.clipPath.containPoint(x, y)) {
                return false;
            }
            if (el.silent) {
                isSilent = true;
            }
            el = el.parent;
        }
        return isSilent ? 'silent' : true;
    }
    return false;
}

/**
 * @private
 * @method afterListenerChanged
 * @param {Function} handlerInstance 
 */
function afterListenerChanged(handlerInstance) {
    //监听整个页面上的事件
    let allSilent = handlerInstance.isSilent('pagemousemove')
        && handlerInstance.isSilent('pagemouseup')
        && handlerInstance.isSilent('pagekeydown')
        && handlerInstance.isSilent('pagekeyup');
    let interceptor = handlerInstance.interceptor;
    interceptor && interceptor.togglePageEvent && interceptor.togglePageEvent(!allSilent);
}

/**
 * @method constructor GlobalEventDispatcher
 * @param {fishTopo.core.Storage} storage Storage instance.
 * @param {Painter} painter Painter instance.
 * @param {HandlerProxy} interceptor HandlerProxy instance.
 * @param {HTMLElement} painterRoot painter.root (not painter.getViewportRoot()).
 */
let GlobalEventDispatcher = function (storage, painter, interceptor, painterRoot) {
    Eventful.call(this, {
        afterListenerChanged: dataUtil.bind(afterListenerChanged, null, this)
    });

    /**
     * @property storage
     */
    this.storage = storage;

    /**
     * @property painter
     */
    this.painter = painter;

    /**
     * @property painterRoot
     */
    this.painterRoot = painterRoot;

    interceptor = interceptor || new EmptyInterceptor();

    /**
     * @property interceptor
     */
    this.interceptor = null;

    /**
     * @private 
     * @property {Object} _hovered
     */
    this._hovered = {};

    /**
     * @private
     * @property {Date} _lastTouchMoment
     */
    this._lastTouchMoment;

    /**
     * @private
     * @property {Number} _lastX
     */
    this._lastX;

    /**
     * @private
     * @property {Number} _lastY
     */
    this._lastY;

    /**
     * @private
     * @property _gestureMgr
     */
    this._gestureMgr;

    this.setHandlerProxy(interceptor);

    //start drag-drop manager.
    this._ddMgr = new DragDropMgr(this).startListen();

    //start transform manager.
    this._transformMgr = new TransformEventMgr(this).startListen();

    //start link manager.
    this._linkMgr = new LinkMgr(this).startListen();
};

GlobalEventDispatcher.prototype = {

    constructor: GlobalEventDispatcher,

    disableDrag:function(){
        this._ddMgr.stopListen();
    },

    enableDrag:function(){
        this._ddMgr.startListen();
    },

    disableTransform:function(){
        this._transformMgr.stopListen();
    },

    enableTransform:function(){
        this._transformMgr.startListen();
    },

    /**
     * @method setHandlerProxy
     * @param {*} interceptor 
     */
    setHandlerProxy: function (interceptor) {
        if (this.interceptor) {
            this.interceptor.dispose();
        }

        if (interceptor) {
            dataUtil.each(handlerNames, function (name) {
                // 监听 Proxy 上面派发的原生DOM事件，转发给本类的处理方法。
                interceptor.on && interceptor.on(name, this[name], this);
            }, this);
            // Attach handler
            interceptor.handler = this;
        }
        this.interceptor = interceptor;
    },

    /**
     * @method mousemove
     * @param {*} interceptor 
     */
    mousemove: function (event) {
        let x = event.topoX;
        let y = event.topoY;

        let lastHovered = this._hovered;
        let lastHoveredTarget = lastHovered.target;

        // If lastHoveredTarget is removed from topo (detected by '__topo') by some API call
        // (like 'setOption' or 'dispatchAction') in event handlers, we should find
        // lastHovered again here. Otherwise 'mouseout' can not be triggered normally.
        // See #6198.
        if (lastHoveredTarget && !lastHoveredTarget.__topo) {
            lastHovered = this.findHover(lastHovered.x, lastHovered.y);
            lastHoveredTarget = lastHovered.target;
        }

        let hovered = this._hovered = this.findHover(x, y);
        let hoveredTarget = hovered.target;
        let interceptor = this.interceptor;
        interceptor.setCursor && interceptor.setCursor(hoveredTarget ? hoveredTarget.cursor : 'default');

        // Mouse out on previous hovered element
        if (lastHoveredTarget && hoveredTarget !== lastHoveredTarget) {
            this.dispatchToElement(lastHovered, 'mouseout', event);
        }

        // Mouse moving on one element
        this.dispatchToElement(hovered, 'mousemove', event);

        // Mouse over on a new element
        if (hoveredTarget && hoveredTarget !== lastHoveredTarget) {
            this.dispatchToElement(hovered, 'mouseover', event);
        }
    },

    /**
     * @method mouseout
     * @param {*} interceptor 
     */
    mouseout: function (event) {
        this.dispatchToElement(this._hovered, 'mouseout', event);

        // There might be some doms created by upper layer application
        // at the same level of painter.getViewportRoot() (e.g., tooltip
        // dom created by echarts), where 'globalout' event should not
        // be triggered when mouse enters these doms. (But 'mouseout'
        // should be triggered at the original hovered element as usual).
        let element = event.toElement || event.relatedTarget;
        let innerDom;
        do {
            element = element && element.parentNode;
        }
        while (element && element.nodeType !== 9 && !(
            innerDom = element === this.painterRoot
        ));

        !innerDom && this.trigger('globalout', {event: event});
    },

    pagemousemove: dataUtil.curry(pageEventHandler, 'pagemousemove'),

    pagemouseup: dataUtil.curry(pageEventHandler, 'pagemouseup'),

    pagekeydown: dataUtil.curry(pageEventHandler, 'pagekeydown'),
    
    pagekeyup: dataUtil.curry(pageEventHandler, 'pagekeyup'),

    /**
     * @method resize
     */
    resize: function () {
        this._hovered = {};
    },

    /**
     * @method dispatch
     * Dispatch event
     * @param {String} eventName
     * @param {Event} eventArgs
     */
    dispatch: function (eventName, eventArgs) {
        let handler = this[eventName];
        handler && handler.call(this, eventArgs);
    },

    /**
     * @method dispose
     */
    dispose: function () {
        this.interceptor.dispose();
        this.storage = null;
        this.interceptor = null;
        this.painter = null;
    },

    /**
     * @method setCursorStyle
     * 设置默认的cursor style
     * @param {String} [cursorStyle='default'] 例如 crosshair
     */
    setCursorStyle: function (cursorStyle) {
        this.interceptor.setCursor && this.interceptor.setCursor(cursorStyle);
    },

    /**
     * @private
     * @method dispatchToElement
     * 事件分发代理，把事件分发给 canvas 中绘制的元素。
     *
     * @param {Object} targetInfo {target, topTarget} 目标图形元素
     * @param {String} eventName 事件名称
     * @param {Object} event 事件对象
     */
    dispatchToElement: function (targetInfo, eventName, event) {
        targetInfo = targetInfo || {};
        let el = targetInfo.target;
        if (el && el.silent) {
            return;
        }
        let eventHandler = 'on' + eventName;
        let eventPacket = makeEventPacket(eventName, targetInfo, event);

        //模拟DOM中的事件冒泡行为，事件一直向上层传播，直到没有父层节点为止。
        while (el) {
            el[eventHandler]&& (eventPacket.cancelBubble = el[eventHandler].call(el, eventPacket));
            el.trigger(eventName, eventPacket);
            el = el.parent;
            if (eventPacket.cancelBubble) {
                break;
            }
        }

        if (!eventPacket.cancelBubble) {
            // 冒泡到顶级 fishTopo 对象
            this.trigger(eventName, eventPacket);
            // 分发事件到用户自定义层
            // 用户有可能在全局 click 事件中 dispose，所以需要判断下 painter 是否存在
            this.painter && this.painter.eachOtherLayer(function (layer) {
                if (typeof (layer[eventHandler]) === 'function') {
                    layer[eventHandler].call(layer, eventPacket);
                }
                if (layer.trigger) {
                    layer.trigger(eventName, eventPacket);
                }
            });
        }
    },

    /**
     * @method findHover
     * @param {Number} x
     * @param {Number} y
     * @param {Displayable} exclude
     * @return {Element}
     */
    findHover: function (x, y, exclude) {
        let list = this.storage.getDisplayList();
        let out = {x: x, y: y};

        for (let i = list.length - 1; i >= 0; i--) {
            let hoverCheckResult;
            if (list[i] !== exclude
                && !list[i].ignore
                && (hoverCheckResult = isHover(list[i], x, y))
            ) {
                !out.topTarget && (out.topTarget = list[i]);
                if (hoverCheckResult !== 'silent') {
                    out.target = list[i];
                    break;
                }
            }
        }

        return out;
    },

    /**
     * @method processGesture
     * @param {Event} event 
     * @param {String} phase 
     */
    processGesture: function (event, phase) {
        if (!this._gestureMgr) {
            this._gestureMgr = new GestureMgr();
        }
        let gestureMgr = this._gestureMgr;
        phase === 'start' && gestureMgr.clear();
        let gestureInfo = gestureMgr.recognize(
            event,
            this.findHover(event.topoX, event.topoY, null).target,
            this.interceptor.dom
        );
        phase === 'end' && gestureMgr.clear();

        // Do not do any preventDefault here. Upper application do that if necessary.
        if (gestureInfo) {
            let type = gestureInfo.type;
            event.gestureEvent = type;
            this.dispatchToElement({target: gestureInfo.target}, type, gestureInfo.event);
        }
    }
};

// Common handlers
dataUtil.each(['click', 'mousedown', 
    'mouseup', 'mousewheel', 
    'dblclick', 'contextmenu'], function (name) {
    GlobalEventDispatcher.prototype[name] = function (event) {
        // Find hover again to avoid click event is dispatched manually. Or click is triggered without mouseover
        let hovered = this.findHover(event.topoX, event.topoY);
        let hoveredTarget = hovered.target;

        if (name === 'mousedown') {
            this._downEl = hoveredTarget;
            this._downPoint = [event.topoX, event.topoY];
            // In case click triggered before mouseup
            this._upEl = hoveredTarget;
        }
        else if (name === 'mouseup') {
            this._upEl = hoveredTarget;
        }
        else if (name === 'click') {
            if (this._downEl !== this._upEl
                // Original click event is triggered on the whole canvas element,
                // including the case that `mousedown` - `mousemove` - `mouseup`,
                // which should be filtered, otherwise it will bring trouble to
                // pan and zoom.
                || !this._downPoint
                // Arbitrary value
                || vectorUtil.dist(this._downPoint, [event.topoX, event.topoY]) > 4
            ) {
                return;
            }
            this._downPoint = null;
        }

        //把事件派发给目标元素
        this.dispatchToElement(hovered, name, event);
    };
});

classUtil.mixin(GlobalEventDispatcher, Eventful);

export default GlobalEventDispatcher;
