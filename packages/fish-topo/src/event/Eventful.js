/**
 * @abstract
 * @class fishTopo.event.Eventful
 * 
 * Provide event system for the classes that do not support events, the implementation here
 * is similar to W3C DOM events, all the classes need event support can mixin the functions here.
 * 
 * 
 * 为不支持事件机制的类提供事件支持，基本机制类似 W3C DOM 事件，需要事件机制的类可以 mixin 此类中的工具函数。
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

/**
 * @method constructor Eventful
 * @param {Object} [eventProcessor] 
 * The object eventProcessor is the scope when `eventProcessor.xxx` called. 
 * 
 * 
 * 事件处理者，也就是当前事件处理函数执行时的作用域。
 * @param {Function} [eventProcessor.normalizeQuery]
 *        param: {String|Object} Raw query.
 *        return: {String|Object} Normalized query.
 * @param {Function} [eventProcessor.filter] 
 * Event will be dispatched only if it returns `true`.
 * 
 * 
 * 当此方法返回 `true` 的时候事件才会派发。
 *        param: {String} eventType
 *        param: {String|Object} query
 *        return: {Boolean}
 * @param {Function} [eventProcessor.afterTrigger] 
 * Called after all handlers called.
 * 
 * 
 * 此方法会在事件处理函数被调用之后执行。
 *        param: {String} eventType
 * @param {Function} [eventProcessor.afterListenerChanged] 
 * Called when any listener added or removed.
 * 
 * 
 * 此方法在添加或者删除事件监听器的时候被调用。
 *        param: {String} eventType
 */
let Eventful = function (eventProcessor) {
    this._$handlers = {};
    this._$eventProcessor = eventProcessor;
    this._$suspends = new Set();
};

Eventful.prototype = {

    constructor: Eventful,

    clearAll:function(){
        this._$handlers = {};
        this._$eventProcessor = null;
        this._$suspends = new Set();
    },

    /**
     * @method
     * The handler can only be triggered once, then removed.
     *
     * 
     * 处理函数只会被调用一次，然后就会删除。
     * @param {String} event 
     * The event name.
     * 
     * 
     * 事件名。
     * @param {String|Object} [query] 
     * Condition used on event filter.
     * 
     * 
     * 事件过滤条件。
     * @param {Function} handler 
     * The event handler.
     * 
     * 
     * 事件处理函数。
     * @param {Object} context
     * The context in which the handler is executed.
     * 
     * 
     * 事件处理函数执行的上下文。
     */
    one: function (event, query, handler, context) {
        return on(this, event, query, handler, context, true);
    },

    /**
     * @method
     * Bind a event handler.
     *
     * 
     * 绑定事件处理函数。
     * 
     * @param {String} event 
     * The event name.
     * 
     * 
     * 事件名。
     * @param {String|Object} [query] 
     * Condition used on event filter.
     * 
     * 
     * 事件过滤条件。
     * @param {Function} handler 
     * The event handler.
     * 
     * 
     * 事件处理函数。
     * @param {Object} context
     * The context in which the handler is executed.
     * 
     * 
     * 事件处理函数执行的上下文。
     */
    on: function (event, query, handler, context) {
        return on(this, event, query, handler, context, false);
    },

    /**
     * @method
     * Whether any event handler has bound.
     *
     * 
     * 是否绑定了事件处理函数。
     * @param  {String}  event
     * @return {Boolean}
     */
    isSilent: function (event) {
        let _h = this._$handlers;
        return !_h[event] || !_h[event].length;
    },

    /**
     * @method
     * Unbind a event handler.
     *
     * 
     * 解除事件处理函数。
     * @param {String} [event] 
     * The event name. If this parameter is null, "off" all listeners.
     * 
     * 
     * 事件名，如果此参数为 null，所有事件监听器都会被删除。
     * @param {Function} [handler] 
     * The event handler. If this parameter is null, "off" all listeners.
     * 
     * 
     * 事件处理函数，如果此参数为 null，所有事件监听器都会被删除。
     */
    off: function (event, handler,context) {
        let _h = this._$handlers;
        if (!event) {
            this._$handlers = {};
            return this;
        }
        if (handler) {
            if (_h[event]) {
                let newList = [];
                for (let i = 0, l = _h[event].length; i < l; i++) {
                    if (_h[event][i].ctx !== context
                        &&_h[event][i].h !== handler){
                        newList.push(_h[event][i]);
                    }
                }
                _h[event] = newList;
            }
            if (_h[event] && _h[event].length === 0) {
                delete _h[event];
            }
        }else {
            delete _h[event];
        }
        callListenerChanged(this, event);
        return this;
    },

    /**
     * @method
     * Trigger an event.
     *
     * 
     * 触发一个事件。
     * @param {String} eventName The event name.
     */
    trigger: function (eventName) {
        if(this._$suspends.has(eventName)){
            return;
        }
        let _h = this._$handlers[eventName];
        let eventProcessor = this._$eventProcessor;
        if (_h) {
            let args = arguments;
            let argLen = args.length;

            if (argLen > 3) {
                args = Array.prototype.slice.call(args, 1);
            }

            let len = _h.length;
            for (let i = 0; i < len;) {
                let hItem = _h[i];
                if (eventProcessor
                    && eventProcessor.filter
                    && hItem.query != null
                    && !eventProcessor.filter(eventName, hItem.query)
                ) {
                    i++;
                    continue;
                }

                // Optimize advise from backbone
                switch (argLen) {
                    case 1:
                        hItem.h.call(hItem.ctx);
                        break;
                    case 2:
                        hItem.h.call(hItem.ctx, args[1]);
                        break;
                    case 3:
                        hItem.h.call(hItem.ctx, args[1], args[2]);
                        break;
                    case 4:
                        hItem.h.call(hItem.ctx, args[1], args[2], args[3]);
                        break;
                    case 5:
                        hItem.h.call(hItem.ctx, args[1], args[2], args[3], args[4]);
                        break;
                    default:
                        hItem.h.apply(hItem.ctx, args);
                        break;
                }

                if (hItem.one) {
                    _h.splice(i, 1);
                    len--;
                }else {
                    i++;
                }
            }
        }

        eventProcessor && eventProcessor.afterTrigger && eventProcessor.afterTrigger(eventName);
        return this;
    },

    /**
     * @method suspend
     * Suspend an event. The suspended event will not be triggered. During the touch and mouse interaction, we often need to 
     * suspend some events to provent them been triggered by accident.
     * 
     * 
     * 被挂起的事件不会触发。在鼠标和触摸屏交互的过程中，经常需要把某个事件临时挂起以避免误触。
     * @param {String} eventName 
     */
    suspend:function(eventName){
        this._$suspends.add(eventName);
    },

    /**
     * @method resume
     * Resume an event.
     * 
     * 
     * 恢复触发。
     * @param {String} eventName 
     */
    resume:function(eventName){
        this._$suspends.delete(eventName);
    },

    /**
     * @method triggerWithContext
     * Dispatch a event with context, which is specified sa the last parameter of the trigger() method.
     *
     * 
     * 在指定的上下文中触发事件，上下文可以在 trigger 函数的最后一个参数进行指定。
     * @param {String} eventName The event name.
     */
    triggerWithContext: function (eventName) {
        let _h = this._$handlers[eventName];
        let eventProcessor = this._$eventProcessor;

        if (_h) {
            let args = arguments;
            let argLen = args.length;

            if (argLen > 4) {
                args = Array.prototype.slice.call(args, 1, args.length - 1);
            }
            let ctx = args[args.length - 1];

            let len = _h.length;
            for (let i = 0; i < len;) {
                let hItem = _h[i];
                if (eventProcessor
                    && eventProcessor.filter
                    && hItem.query != null
                    && !eventProcessor.filter(eventName, hItem.query)
                ) {
                    i++;
                    continue;
                }

                // Optimize advise from backbone
                switch (argLen) {
                    case 1:
                        hItem.h.call(ctx);
                        break;
                    case 2:
                        hItem.h.call(ctx, args[1]);
                        break;
                    case 3:
                        hItem.h.call(ctx, args[1], args[2]);
                        break;
                    case 4:
                        hItem.h.call(ctx, args[1], args[2], args[3]);
                        break;
                    case 5:
                        hItem.h.call(ctx, args[1], args[2], args[3], args[4]);
                        break;
                    default:
                        hItem.h.apply(ctx, args);
                        break;
                }

                if (hItem.one) {
                    _h.splice(i, 1);
                    len--;
                }else {
                    i++;
                }
            }
        }

        eventProcessor && eventProcessor.afterTrigger && eventProcessor.afterTrigger(eventName);
        return this;
    }
};

/**
 * @private
 * @method callListenerChanged
 * @param {Element} eventful 
 * @param {String} eventType 
 */
function callListenerChanged(eventful, eventType) {
    let eventProcessor = eventful._$eventProcessor;
    if (eventProcessor && eventProcessor.afterListenerChanged) {
        eventProcessor.afterListenerChanged(eventType);
    }
}

/**
 * @private
 * @method normalizeQuery
 * @param {*} host 
 * @param {*} query 
 */
function normalizeQuery(host, query) {
    let eventProcessor = host._$eventProcessor;
    if (query != null && eventProcessor && eventProcessor.normalizeQuery) {
        query = eventProcessor.normalizeQuery(query);
    }
    return query;
}

/**
 * @private
 * @method on
 * @param {Element} eventful 
 * @param {Event} event 
 * @param {*} query 
 * @param {Function} handler 
 * @param {Object} context 
 * @param {Boolean} isOnce 
 */
function on(eventful, event, query, handler, context, isOnce) {
    let _h = eventful._$handlers;

    if (typeof query === 'function') {
        context = handler;
        handler = query;
        query = null;
    }

    if (!handler || !event) {
        return eventful;
    }

    query = normalizeQuery(eventful, query);

    if (!_h[event]) {
        _h[event] = [];
    }

    for (let i = 0; i < _h[event].length; i++) {
        if (_h[event][i].ctx === context
            &&_h[event][i].h === handler) {
            return eventful;
        }
    }

    let wrap = {
        h: handler,
        one: isOnce,
        query: query,
        ctx: context || eventful,
        // FIXME
        // Do not publish this feature util it is proved that it makes sense.
        callAtLast: handler.topoEventfulCallAtLast
    };

    let lastIndex = _h[event].length - 1;
    let lastWrap = _h[event][lastIndex];
    (lastWrap && lastWrap.callAtLast)
        ? _h[event].splice(lastIndex, 0, wrap)
        : _h[event].push(wrap);

    callListenerChanged(eventful, event);

    return eventful;
}

export default Eventful;