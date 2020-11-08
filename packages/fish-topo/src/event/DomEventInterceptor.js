/* eslint-disable no-prototype-builtins */
import Eventful from './Eventful';
import * as eventUtil from '../utils/event_util';
import * as dataUtil from '../utils/data_structure_util';
import * as classUtil from '../utils/class_util';
import env from '../utils/env';

/**
 * @class fishTopo.event.DomEventInterceptor
 * The core functions of DomEventInterceptor are intercepting the native events on DOM element, forward them to the FishTopo instance, 
 * then FishTopoEventHandler will dispatch them to the elements inside canvas.
 * Most of the DOM events that need to be dispatched are attached to the wrapper div of canvas, like click, dbclick, contextmenu.
 * Few of the DOM evnets are attached to the document directly, like mousemove, mouseout, because the mouse may be out of the canvas area
 * when dragging or interacting with the keyboard.
 * 
 * 
 * DomEventInterceptor 的主要功能是：拦截 DOM 标签上的原生事件，转发到 FishTopo 实例上，
 * 在 FishTopoEventHandler 类中会把事件进一步分发给 canvas 内部的元素。
 * 需要转发的大部分 DOM 事件挂载在 canvas 的外层容器 div 上面，例如：click, dbclick, contextmenu 等；
 * 少部分 DOM 事件直接挂载在 document 对象上，例如：mousemove, mouseout。因为在实现拖拽和
 * 键盘交互的过程中，鼠标指针可能已经脱离了 canvas 所在的区域。
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

let TOUCH_CLICK_DELAY = 300;
let pageEventSupported = env.domSupported;

/**
 * [Page Event]
 * "page events" are `pagemousemove` and `pagemouseup`.
 * They are triggered when a user pointer interacts on the whole webpage
 * rather than only inside the canvas area.
 *
 * The use case of page events can be, for example, if we are implementing a dragging feature:
 * ```js
 * topo.eventDispatcher.on('mousedown', function (event) {
 *     let dragging = true;
 *     topo.eventDispatcher.on('pagemousemove', handleMouseMove);
 *     topo.eventDispatcher.on('pagemouseup', handleMouseUp);
 *
 *     function handleMouseMove(event) {
 *         if (dragging) { ... }
 *     }
 *     function handleMouseUp(event) {
 *         dragging = false; ...
 *         topo.eventDispatcher.off('pagemousemove', handleMouseMove);
 *         topo.eventDispatcher.off('pagemouseup', handleMouseUp);
 *     }
 * });
 * ```
 *
 * [NOTICE]:
 * 1. There are cases that `pagemousexxx` will not be triggered when the pointer is out of
 * canvas area:
 * "document.eventUtil.addEventListener" is not available in the current runtime environment,
 * or there is any `stopPropagation` called at some user defined listeners on the ancestors
 * of the canvas dom.
 * 2. Although those bad cases exist, users do not need to worry about that. That is, if you
 * listen to `pagemousexxx`, you do not need to listen to the correspoinding event `mousexxx`
 * any more.
 * 
 * 
 * [Page Event]
 * “页面事件”指的是`pagemousemove` 和 `pagemouseup`。
 * 这两个事件会在整个页面范围内触发，而不仅仅在 canvas 区域。
 * 页面事件的一个案例如下：
 * 
 * ```js
 * topo.eventDispatcher.on('mousedown', function (event) {
 *     let dragging = true;
 *     topo.eventDispatcher.on('pagemousemove', handleMouseMove);
 *     topo.eventDispatcher.on('pagemouseup', handleMouseUp);
 *
 *     function handleMouseMove(event) {
 *         if (dragging) { ... }
 *     }
 *     function handleMouseUp(event) {
 *         dragging = false; ...
 *         topo.eventDispatcher.off('pagemousemove', handleMouseMove);
 *         topo.eventDispatcher.off('pagemouseup', handleMouseUp);
 *     }
 * });
 * ```
 * [注意]:
 * 1. 在某些情况下，当鼠标不在 canvas 区域中时，`pagemousexxx` 之类的事件不会触发，例如："document.eventUtil.addEventListener" 在当前环境中
 * 不可用；或者当使用者在 canvas 的父层标签上挂载事件时调用了 `stopPropagation`  方法。
 * 2. 虽然以上这些糟糕的情况是存在的，但是使用者不需要操心它们，因为你可以监听 `pagemousexxx` 之类的事件，而不是对应的 `mousexxx` 系列。
 */
let localNativeListenerNames = (function () {
    let mouseHandlerNames = [
        'click', 'dblclick', 'mousewheel', 'mouseout',
        'mouseup', 'mousedown', 'mousemove', 'contextmenu'
    ];
    let touchHandlerNames = [
        'touchstart', 'touchend', 'touchmove'
    ];
    let pointerEventNameMap = {
        pointerdown: 1, pointerup: 1, pointermove: 1, pointerout: 1
    };
    let pointerHandlerNames = dataUtil.map(mouseHandlerNames, function (name) {
        let nm = name.replace('mouse', 'pointer');
        return pointerEventNameMap.hasOwnProperty(nm) ? nm : name;
    });

    return {
        mouse: mouseHandlerNames,
        touch: touchHandlerNames,
        pointer: pointerHandlerNames
    };
})();

let globalNativeListenerNames = {
    keyboard:['keydown','keyup'],
    mouse: ['mousemove', 'mouseup'],
    touch: ['touchmove', 'touchend'],
    pointer: ['pointermove', 'pointerup']
};

function eventNameFix(name) {
    return (name === 'mousewheel' && env.browser.firefox) ? 'DOMMouseScroll' : name;
}

function isPointerFromTouch(event) {
    let pointerType = event.pointerType;
    return pointerType === 'pen' || pointerType === 'touch';
}

/**
 * Prevent mouse event from being dispatched after Touch Events action
 * @see <https://github.com/deltakosh/handjs/blob/master/src/hand.base.js>
 * 1. Mobile browsers dispatch mouse events 300ms after touchend.
 * 2. Chrome for Android dispatch mousedown for long-touch about 650ms
 * Result: Blocking Mouse Events for 700ms.
 *
 * 
 * 防止鼠标事件在 Touch 事件之后触发
 * @see <https://github.com/deltakosh/handjs/blob/master/src/hand.base.js>
 * 1. 移动端的浏览器会在触摸之后 300ms 派发鼠标事件。
 * 2. Android 上的 Chrome 浏览器会在长按约 650ms 之后派发 mousedown 事件。
 * 所以最终结果就是：禁止鼠标事件 700ms。
 * 
 * @param {DOMHandlerScope} scope
 */
function setTouchTimer(scope) {
    scope.touching = true;
    if (scope.touchTimer != null) {
        clearTimeout(scope.touchTimer);
        scope.touchTimer = null;
    }
    scope.touchTimer = setTimeout(function () {
        scope.touching = false;
        scope.touchTimer = null;
    }, 700);
}

function markTriggeredFromLocal(event) {
    event && (event.topoIsFromLocal = true);
}

function isTriggeredFromLocal(event) {
    return !!(event && event.topoIsFromLocal);
}

// Mark touch, which is useful in distinguish touch and
// mouse event in upper applicatoin.
function markTouch(event) {
    event && (event.topoByTouch = true);
}


// ----------------------------
// Native event handlers BEGIN
// ----------------------------

/**
 * Local 指的是 Canvas 内部的区域。
 * Local DOM Handlers
 * @this {DomEventInterceptor}
 */
let localDOMHandlers = {

    mouseout: function (event) {
        event = eventUtil.normalizeEvent(this.dom, event);

        let element = event.toElement || event.relatedTarget;
        if (element !== this.dom) {
            while (element && element.nodeType !== 9) {
                // 忽略包含在root中的dom引起的mouseOut
                if (element === this.dom) {
                    return;
                }

                element = element.parentNode;
            }
        }

        // 这里的 trigger() 方法是从 Eventful 里面的 mixin 进来的，调用这个 trigger() 方法的时候，是在 FishTopo 内部，也就是 canvas 里面触发事件。
        // 这里实现的目的是：把接受到的 HTML 事件转发到了 canvas 内部。
        this.trigger('mouseout', event);
    },

    touchstart: function (event) {
        // Default mouse behaviour should not be disabled here.
        // For example, page may needs to be slided.
        event = eventUtil.normalizeEvent(this.dom, event);

        markTouch(event);

        this._lastTouchMoment = new Date();

        this.handler.processGesture(event, 'start');

        // For consistent event listener for both touch device and mouse device,
        // we simulate "mouseover-->mousedown" in touch device. So we trigger
        // `mousemove` here (to trigger `mouseover` inside), and then trigger
        // `mousedown`.
        localDOMHandlers.mousemove.call(this, event);
        localDOMHandlers.mousedown.call(this, event);
    },

    touchmove: function (event) {
        event = eventUtil.normalizeEvent(this.dom, event);

        markTouch(event);

        this.handler.processGesture(event, 'change');

        // Mouse move should always be triggered no matter whether
        // there is gestrue event, because mouse move and pinch may
        // be used at the same time.
        localDOMHandlers.mousemove.call(this, event);
    },

    touchend: function (event) {
        event = eventUtil.normalizeEvent(this.dom, event);

        markTouch(event);

        this.handler.processGesture(event, 'end');

        localDOMHandlers.mouseup.call(this, event);

        // Do not trigger `mouseout` here, in spite of `mousemove`(`mouseover`) is
        // triggered in `touchstart`. This seems to be illogical, but by this mechanism,
        // we can conveniently implement "hover style" in both PC and touch device just
        // by listening to `mouseover` to add "hover style" and listening to `mouseout`
        // to remove "hover style" on an element, without any additional code for
        // compatibility. (`mouseout` will not be triggered in `touchend`, so "hover
        // style" will remain for user view)

        // click event should always be triggered no matter whether
        // there is gestrue event. System click can not be prevented.
        if (+new Date() - this._lastTouchMoment < TOUCH_CLICK_DELAY) {
            localDOMHandlers.click.call(this, event);
        }
    },

    pointerdown: function (event) {
        localDOMHandlers.mousedown.call(this, event);

        // if (useMSGuesture(this, event)) {
        //     this._msGesture.addPointer(event.pointerId);
        // }
    },

    pointermove: function (event) {
        // FIXME:
        // pointermove is so sensitive that it always triggered when
        // tap(click) on touch screen, which affect some judgement in
        // upper application. So, we dont support mousemove on MS touch
        // device yet.
        if (!isPointerFromTouch(event)) {
            localDOMHandlers.mousemove.call(this, event);
        }
    },

    pointerup: function (event) {
        localDOMHandlers.mouseup.call(this, event);
    },

    pointerout: function (event) {
        // pointerout will be triggered when tap on touch screen
        // (IE11+/Edge on MS Surface) after click event triggered,
        // which is inconsistent with the mousout behavior we defined
        // in touchend. So we unify them.
        // (check localDOMHandlers.touchend for detailed explanation)
        if (!isPointerFromTouch(event)) {
            localDOMHandlers.mouseout.call(this, event);
        }
    }

};

/**
 * Othere DOM UI Event handlers for topo dom.
 * FishTopo 内部的 DOM 结构默认支持以下7个事件。
 * @this {DomEventInterceptor}
 */
dataUtil.each(['click', 'mousemove', 'mousedown', 
    'mouseup', 'mousewheel', 'dblclick', 'contextmenu'], function (name) {
    localDOMHandlers[name] = function (event) {
        event = eventUtil.normalizeEvent(this.dom, event);
        this.trigger(name, event);

        if (name === 'mousemove' || name === 'mouseup') {
            // Trigger `pagemousexxx` immediately with the same event object.
            // See the reason described in the comment of `[Page Event]`.
            this.trigger('page' + name, event);
        }
    };
});

/**
 * 这里用来监听外层 HTML 里面的 DOM 事件。监听这些事件的目的是为了方便实现拖拽功能，因为
 * 一旦鼠标离开 Canvas 的区域，就无法触发 Canvas 内部的 mousemove 和 mouseup 事件，这里直接
 * 监听外层 HTML 上的 mousemove 和 mouseup，绕开这种问题。
 * 
 * Page DOM UI Event handlers for global page.
 * @this {DomEventInterceptor}
 */
let globalDOMHandlers = {

    touchmove: function (event) {
        markTouch(event);
        globalDOMHandlers.mousemove.call(this, event);
    },

    touchend: function (event) {
        markTouch(event);
        globalDOMHandlers.mouseup.call(this, event);
    },

    pointermove: function (event) {
        // FIXME:
        // pointermove is so sensitive that it always triggered when
        // tap(click) on touch screen, which affect some judgement in
        // upper application. So, we dont support mousemove on MS touch
        // device yet.
        if (!isPointerFromTouch(event)) {
            globalDOMHandlers.mousemove.call(this, event);
        }
    },

    pointerup: function (event) {
        globalDOMHandlers.mouseup.call(this, event);
    },

    mousemove: function (event) {
        event = eventUtil.normalizeEvent(this.dom, event, true);
        this.trigger('pagemousemove', event);
    },

    mouseup: function (event) {
        event = eventUtil.normalizeEvent(this.dom, event, true);
        this.trigger('pagemouseup', event);
    },

    keyup: function (event) {
        event = eventUtil.normalizeEvent(this.dom, event, true);
        this.trigger('pagekeyup', event);
    },

    keydown: function (event) {
        event = eventUtil.normalizeEvent(this.dom, event, true);
        this.trigger('pagekeydown', event);
    }
};

// ----------------------------
// Native event handlers END
// ----------------------------


/**
 * @private
 * @method mountDOMEventListeners
 * @param {DomEventInterceptor} domEventInterceptor
 * @param {DOMHandlerScope} domHandlerScope
 * @param {Object} nativeListenerNames {mouse: Array<String>, touch: Array<String>, poiner: Array<String>}
 * @param {Boolean} localOrGlobal `true`: target local, `false`: target global.
 */
function mountDOMEventListeners(instance, scope, nativeListenerNames, localOrGlobal) {
    let domHandlers = scope.domHandlers;
    let domTarget = scope.domTarget;

    if (env.pointerEventsSupported) { // Only IE11+/Edge
        // 1. On devices that both enable touch and mouse (e.g., MS Surface and lenovo X240),
        // IE11+/Edge do not trigger touch event, but trigger pointer event and mouse event
        // at the same time.
        // 2. On MS Surface, it probablely only trigger mousedown but no mouseup when tap on
        // screen, which do not occurs in pointer event.
        // So we use pointer event to both detect touch gesture and mouse behavior.
        dataUtil.each(nativeListenerNames.pointer, function (nativeEventName) {
            mountSingle(nativeEventName, function (event) {
                if (localOrGlobal || !isTriggeredFromLocal(event)) {
                    localOrGlobal && markTriggeredFromLocal(event);
                    domHandlers[nativeEventName].call(instance, event);
                }
            });
        });

        // FIXME:
        // Note: MS Gesture require CSS touch-action set. But touch-action is not reliable,
        // which does not prevent defuault behavior occasionally (which may cause view port
        // zoomed in but use can not zoom it back). And event.preventDefault() does not work.
        // So we have to not to use MSGesture and not to support touchmove and pinch on MS
        // touch screen. And we only support click behavior on MS touch screen now.

        // MS Gesture Event is only supported on IE11+/Edge and on Windows 8+.
        // We dont support touch on IE on win7.
        // See <https://msdn.microsoft.com/en-us/library/dn433243(v=vs.85).aspx>
        // if (typeof MSGesture === 'function') {
        //     (this._msGesture = new MSGesture()).target = dom; // jshint ignore:line
        //     dom.eventUtil.addEventListener('MSGestureChange', onMSGestureChange);
        // }
    }else {
        if (env.touchEventsSupported) {
            dataUtil.each(nativeListenerNames.touch, function (nativeEventName) {
                mountSingle(nativeEventName, function (event) {
                    if (localOrGlobal || !isTriggeredFromLocal(event)) {
                        localOrGlobal && markTriggeredFromLocal(event);
                        domHandlers[nativeEventName].call(instance, event);
                        setTouchTimer(scope);
                    }
                });
            });
            // Handler of 'mouseout' event is needed in touch mode, which will be mounted below.
            // eventUtil.addEventListener(root, 'mouseout', this._mouseoutHandler);
        }

        // 1. Considering some devices that both enable touch and mouse event (like on MS Surface
        // and lenovo X240, @see #2350), we make mouse event be always listened, otherwise
        // mouse event can not be handle in those devices.
        // 2. On MS Surface, Chrome will trigger both touch event and mouse event. How to prevent
        // mouseevent after touch event triggered, see `setTouchTimer`.
        dataUtil.each(nativeListenerNames.mouse, function (nativeEventName) {
            mountSingle(nativeEventName, function (event) {
                event = eventUtil.getNativeEvent(event);
                if (!scope.touching
                    && (localOrGlobal || !isTriggeredFromLocal(event))
                ) {
                    localOrGlobal && markTriggeredFromLocal(event);
                    domHandlers[nativeEventName].call(instance, event);
                }
            });
        });

        //挂载键盘事件
        dataUtil.each(nativeListenerNames.keyboard,function(nativeEventName){
            mountSingle(nativeEventName, function (event) {
                if (localOrGlobal || !isTriggeredFromLocal(event)) {
                    localOrGlobal && markTriggeredFromLocal(event);
                    domHandlers[nativeEventName].call(instance, event);
                }
            });
        });
    }

    //用来监听原生 DOM 事件
    function mountSingle(nativeEventName, listener) {
        scope.mounted[nativeEventName] = listener;
        eventUtil.addEventListener(domTarget, eventNameFix(nativeEventName), listener);
    }
}

/**
 * @private
 * @method unmountDOMEventListeners
 * @param {Object} scope 
 */
function unmountDOMEventListeners(scope) {
    let mounted = scope.mounted;
    for (let nativeEventName in mounted) {
        if (mounted.hasOwnProperty(nativeEventName)) {
            eventUtil.removeEventListener(scope.domTarget, eventNameFix(nativeEventName), mounted[nativeEventName]);
        }
    }
    scope.mounted = {};
}

function DOMHandlerScope(domTarget, domHandlers) {
    this.domTarget = domTarget;
    this.domHandlers = domHandlers;

    // Key: eventName
    // value: mounted handler funcitons.
    // Used for unmount.
    this.mounted = {};
    this.touchTimer = null;
    this.touching = false;
}

/**
 * @method constructor
 * @param dom 被代理的 DOM 节点
 */
function DomEventInterceptor(dom) {
    Eventful.call(this);

    /**
     * @property dom
     */
    this.dom = dom;

    /**
     * @private
     * @property _localHandlerScope
     */
    this._localHandlerScope = new DOMHandlerScope(dom, localDOMHandlers);

    if (pageEventSupported) {
        /**
         * @private
         * @property _globalHandlerScope
         */
        this._globalHandlerScope = new DOMHandlerScope(document, globalDOMHandlers);//注意，这里直接监听 document 上的事件
    }

    /**
     * @private
     * @property _pageEventEnabled
     */
    this._pageEventEnabled = false;

    //在构造 DomEventInterceptor 实例的时候，挂载 DOM 事件监听器。
    mountDOMEventListeners(this, this._localHandlerScope, localNativeListenerNames, true);
}

/**
 * @private
 * @method dispose
 */
DomEventInterceptor.prototype.dispose = function () {
    unmountDOMEventListeners(this._localHandlerScope);
    if (pageEventSupported) {
        unmountDOMEventListeners(this._globalHandlerScope);
    }
};

/**
 * @private
 * @method setCursor
 */
DomEventInterceptor.prototype.setCursor = function (cursorStyle) {
    this.dom.style && (this.dom.style.cursor = cursorStyle || 'default');
};

/**
 * @private
 * @method togglePageEvent
 * The implementation of page event depends on listening to document.
 * So we should better only listen to that on needed, and remove the
 * listeners when do not need them to escape unexpected side-effect.
 * @param {Boolean} enableOrDisable `true`: enable page event. `false`: disable page event.
 */
DomEventInterceptor.prototype.togglePageEvent = function (enableOrDisable) {
    dataUtil.assert(enableOrDisable != null);

    if (pageEventSupported && (this._pageEventEnabled ^ enableOrDisable)) {
        this._pageEventEnabled = enableOrDisable;

        let globalHandlerScope = this._globalHandlerScope;
        enableOrDisable
            ? mountDOMEventListeners(this, globalHandlerScope, globalNativeListenerNames)
            : unmountDOMEventListeners(globalHandlerScope);
    }
};

//注意，DomEventInterceptor 也混入了 Eventful 里面提供的事件处理工具。
classUtil.mixin(DomEventInterceptor, Eventful);

export default DomEventInterceptor;
