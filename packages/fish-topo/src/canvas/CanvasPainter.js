/* eslint-disable no-prototype-builtins */
import * as dataUtil from '../utils/data_structure_util';
import * as canvasUtil from '../utils/canvas_util';
import {mathRandom,mathMax} from '../utils/constants';
import {devicePixelRatio} from '../config';
import BoundingRect from '../graphic/BoundingRect';
import CanvasLayer from './CanvasLayer';
import Image from '../graphic/Image';
import timsort from '../utils/timsort';
import env from '../utils/env';
import requestAnimationFrame from '../animation/request_animation_frame';

/**
 * @class fishTopo.canvas.CanvasPainter
 * This CanvasPainter class is based on canvas api of W3C. https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas
 * 
 * 
 * 这是基于 W3C canvas 接口的 CanvasPainter 类。 https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas
 * 
 */

const HOVER_LAYER_QLEVEL = 1e5;
const CANVAS_QLEVEL = 314159;
const EL_AFTER_INCREMENTAL_INC = 0.01;
const INCREMENTAL_INC = 0.001;

export default class CanvasPainter{
    /**
     * @method constructor
     * @param {HTMLDomElement|Canvas|Context} host 
     * This can be a HTMLDomElement like a DIV, or a Canvas instance, 
     * or Context for Wechat mini-program.
     * 
     * 此属性可以是 HTMLDomElement ，比如 DIV 标签；也可以是 Canvas 实例；或者是 Context 实例，因为在某些
     * 运行环境中，不能获得 Canvas 实例的引用，只能获得 Context。
     * @param {fishTopo.core.Storage} storage
     * @param {Object} options
     */
    constructor(host, storage, options={}){
        this.options = dataUtil.extend({},options);

        /**
         * @property {String} type
         */
        this.type = 'canvas';

        /**
         * @property {Number} dpr
         * Device pixel ratio.
         * 
         * 
         * 设备像素比。
         */
        this.dpr = this.options.devicePixelRatio || devicePixelRatio;

        /**
         * @property {HTMLDomElement|Canvas|Context} host 
         * This can be a HTMLDomElement like a DIV, or a Canvas instance, 
         * or Context for Wechat mini-program.
         * 
         * 此属性可以是 HTMLDomElement ，比如 DIV 标签；也可以是 Canvas 实例；或者是 Context 实例，因为在某些
         * 运行环境中，不能获得 Canvas 实例的引用，只能获得 Context。
         */
        this.host = host;
        // There is no style attribute on element in nodejs.
        if (this.host.style) {
            this.host.style['-webkit-tap-highlight-color'] = 'transparent';
            this.host.style['-webkit-user-select'] =
            this.host.style['user-select'] =
            this.host.style['-webkit-touch-callout'] = 'none';
            host.innerHTML = '';
        }

        /**
         * @private
         * @property {HTMLDomElement|Canvas|Context} _host 
         * This can be a HTMLDomElement like a DIV, or a Canvas instance, 
         * or Context for Wechat mini-program. In browser environment, this._host is 
         * a div which is created by FishTopo automaticly, 
         * in other environments, this._host equals this.host.
         * 
         * 此属性可以是 HTMLDomElement ，比如 DIV 标签；也可以是 Canvas 实例；或者是 Context 实例，因为在某些
         * 运行环境中，不能获得 Canvas 实例的引用，只能获得 Context。在浏览器环境中，this._host 是 FishTopo
         * 自己自动创建的 div 层，在其它环境中，this._host 等于 this.root。
         */
        this._host=null;
    
        /**
         * @property {fishTopo.core.Storage} storage
         */
        this.storage = storage;
    
        /**
         * @private
         * @property {Array<Number>}
         */
        let qlevelList = this._qlevelList = [];
    
        /**
         * @private
         * @property {Object<String, CanvasLayer>} layers
         */
        let layers = this._layers = {};
    
        /**
         * @private
         * @property {Object<String, Object>} _layerConfig
         */
        this._layerConfig = {};
    
        /**
         * @private
         * @property _needsManuallyCompositing
         * FishTopo will do compositing when host is a canvas and have multiple zlevels.
         */
        this._needsManuallyCompositing = false;

        /**
         * @private
         * @property {CanvasLayer} _hoverlayer
         */
        this._hoverlayer = null;

        /**
         * @private
         * @property {Array} _hoverElements
         */
        this._hoverElements = [];
    
        this._tmpRect = new BoundingRect();
        this._viewRect = new BoundingRect();

        /**
         * @private
         * @property {Boolean} _singleCanvas
         */
        this._singleCanvas = !this.host.nodeName || this.host.nodeName.toUpperCase() === 'CANVAS';
    
        //The code below is used to compatible with various runtime environments like browser, node-canvas, and WeChat mini-program.
        if (this._singleCanvas) {
            this.dpr = this.options.devicePixelRatio || 1;
            let width = this.host.width || this.options.width || 0;
            let height = this.host.height || this.options.height || 0;
            this.host.width = width * this.dpr;
            this.host.height = height * this.dpr;
    
            this._width = width;
            this._height = height;
    
            // Create layer if only one given canvas
            // Device can be specified to create a high dpi image.
            let mainLayer = new CanvasLayer(this.host,this._width,this._height,this.dpr);
            mainLayer.__builtin__ = true;
            mainLayer.initContext();

            // FIXME: Use canvas width and height
            // mainLayer.resize(width, height);
            layers[CANVAS_QLEVEL] = mainLayer;
            mainLayer.qlevel = CANVAS_QLEVEL;

            // Not use common qlevel.
            qlevelList.push(CANVAS_QLEVEL);
    
            this._host = this.host; // Here, this._host equals this.host.
        }else {
            this._width = this._getSize(0);
            this._height = this._getSize(1);

            let canvasContainer = this.createDomRoot(this._width, this._height);    // Craete a new div inside the host element.
            this._host =canvasContainer;        // In this case, this._host is different from this.host.
            this.host.appendChild(canvasContainer);
        }
    }

    /**
     * @method getHost
     * Do NOT use this method in Wechat mini-program, because we can not get HTMLElement 
     * nor canvas instance.
     * 
     * 
     * 在微信小程序中不要使用此方法，以为在小程序中无法获取 HTMLElement 或者 Canvas 实例。
     * @return {HTMLDivElement}
     */
    getHost() {
        return this._host;
    }

    /**
     * @method getViewportRootOffset
     * Do NOT use this method in Wechat mini-program, because we can not get HTMLElement 
     * nor canvas instance.
     * 
     * 
     * 在微信小程序中不要使用此方法，以为在小程序中无法获取 HTMLElement 或者 Canvas 实例。
     * @return {Object}
     */
    getViewportRootOffset() {
        let host = this.getHost();
        if (host) {
            return {
                offsetLeft: host.offsetLeft || 0,
                offsetTop: host.offsetTop || 0
            };
        }
    }

    /**
     * @method refresh
     * @param {Boolean} [paintAll=false] 
     * Wether force repaint all the elements.
     * 
     * 
     * 是否强制绘制所有元素。
     */
    refresh(paintAll) {
        let list = this.storage.getDisplayList(true);
        let qlevelList = this._qlevelList;
        this._redrawId = mathRandom();
        this._paintList(list, paintAll, this._redrawId);

        // Paint custum layers
        for (let i = 0; i < qlevelList.length; i++) {
            let z = qlevelList[i];
            let layer = this._layers[z];
            if (!layer.__builtin__ && layer.refresh) {
                let clearColor = i === 0 ? this._backgroundColor : null;
                layer.refresh(clearColor);
            }
        }

        this.refreshHover();
        return this;
    }

    /**
     * @method addHover
     * 
     * @param {*} el 
     * @param {*} hoverStyle 
     */
    addHover(el, hoverStyle) {
        if (el.__hoverMir) {
            return;
        }
        let elMirror = new el.constructor({
            style: el.style,
            shape: el.shape,
            z: el.z,
            z2: el.z2,
            silent: el.silent
        });
        elMirror.__from = el;
        el.__hoverMir = elMirror;
        hoverStyle && elMirror.attr({style:hoverStyle});
        this._hoverElements.push(elMirror);
        return elMirror;
    }

    /**
     * @method removeHover
     * @param {*} el 
     */
    removeHover(el) {
        let elMirror = el.__hoverMir;
        let hoverElements = this._hoverElements;
        let idx = dataUtil.indexOf(hoverElements, elMirror);
        if (idx >= 0) {
            hoverElements.splice(idx, 1);
        }
        el.__hoverMir = null;
    }

    /**
     * @method clearHover
     */
    clearHover() {
        let hoverElements = this._hoverElements;
        for (let i = 0; i < hoverElements.length; i++) {
            let from = hoverElements[i].__from;
            if (from) {
                from.__hoverMir = null;
            }
        }
        hoverElements.length = 0;
    }

    /**
     * @method refreshHover
     */
    refreshHover() {
        let hoverElements = this._hoverElements;
        let len = hoverElements.length;
        let hoverLayer = this._hoverlayer;
        hoverLayer && hoverLayer.clear();

        if (!len) {
            return;
        }
        timsort(hoverElements, this.storage.displayableSortFunc);

        // FIXME: Use a extream large qlevel?
        if (!hoverLayer) {
            hoverLayer = this._hoverlayer = this.getLayer(HOVER_LAYER_QLEVEL);
        }

        let scope = {};
        hoverLayer.ctx.save();
        for (let i = 0; i < len;) {
            let el = hoverElements[i];
            let originalEl = el.__from;
            // Original el is removed
            // PENDING
            if (!(originalEl && originalEl.__topo)) {
                hoverElements.splice(i, 1);
                originalEl.__hoverMir = null;
                len--;
                continue;
            }
            i++;

            // Use transform
            // FIXME style and shape ?
            if (!originalEl.invisible) {
                el.transform = originalEl.transform;
                el.inverseTransform = originalEl.inverseTransform;
                el.__clipPaths = originalEl.__clipPaths;
                // el.
                this._doPaintEl(el, hoverLayer, true, scope);
            }
        }

        hoverLayer.ctx.restore();
    }

    /**
     * @method getHoverLayer
     */
    getHoverLayer() {
        return this.getLayer(HOVER_LAYER_QLEVEL);
    }

    /**
     * @private
     * @method _paintList
     * @param {*} list 
     * @param {*} paintAll 
     * @param {*} redrawId 
     */
    _paintList(list, paintAll, redrawId) {
        //如果 redrawId 不一致，说明下一个动画帧已经到来，这里就会直接跳过去，相当于跳过了一帧
        if (this._redrawId !== redrawId) {
            return;
        }

        paintAll = paintAll || false;

        this._updateLayerStatus(list);

        let finished = this._doPaintList(list, paintAll);

        if (this._needsManuallyCompositing) {
            this._compositeManually();
        }

        //如果在一帧的时间内没有绘制完，在下一帧继续绘制。
        //当前本机的测试值，1000 个元素同时进行动画，可以在 16ms 的时间中绘制完成。
        if (!finished) {
            let self = this;
            requestAnimationFrame(function () {
                self._paintList(list, paintAll, redrawId);
            });
        }
    }

    /**
     * @private
     * @method _compositeManually
     */
    _compositeManually() {
        let ctx = this.getLayer(CANVAS_QLEVEL).ctx;
        let width = this._host.width;
        let height = this._host.height;
        ctx.clearRect(0, 0, width, height);
        // PENDING, If only builtin layer?
        this.eachBuiltinLayer(function (layer) {
            if (layer.virtual) {
                ctx.drawImage(layer.canvasInstance, 0, 0, width, height);
            }
        });
    }

    /**
     * @private
     * @method _doPaintList
     */
    _doPaintList(list, paintAll) {
        let layerList = [];
        for (let zi = 0; zi < this._qlevelList.length; zi++) {
            let qlevel = this._qlevelList[zi];
            let layer = this._layers[qlevel];
            if (layer.__builtin__
                && layer !== this._hoverlayer
                && (layer.__dirty || paintAll)
            ) {
                layerList.push(layer);
            }
        }

        let finished = true;

        for (let k = 0; k < layerList.length; k++) {
            let layer = layerList[k];
            let ctx = layer.ctx;
            let scope = {};
            ctx.save();

            let start = paintAll ? layer.__startIndex : layer.__drawIndex;
            let useTimer = !paintAll && layer.incremental && Date.now;
            let startTime = useTimer && Date.now();
            let clearColor = layer.qlevel === this._qlevelList[0]
                ? this._backgroundColor : null;

            // All elements in this layer are cleared.
            if (layer.__startIndex === layer.__endIndex) {
                layer.clear(false, clearColor);
            }else if (start === layer.__startIndex) {
                let firstEl = list[start];
                if (!firstEl.incremental || paintAll) {
                    layer.clear(false, clearColor);
                }
            }

            if (start === -1) {
                console.error('For some unknown reason. drawIndex is -1');
                start = layer.__startIndex;
            }

            let i = start;
            for (;i < layer.__endIndex; i++) {
                let el = list[i];
                this._doPaintEl(el, layer, paintAll, scope);
                el.__dirty = el.__dirtyText = false;

                if (useTimer) {
                    // Date.now can be executed in 13,025,305 ops/second.
                    let dTime = Date.now() - startTime;
                    // Give 15 millisecond to draw.
                    // The rest elements will be drawn in the next frame.
                    // 这里的时间计算非常重要，如果 15ms 的时间内没有能绘制完所有元素，则跳出，等待下一帧继续绘制
                    // 但是 15ms 的时间依然是有限的，如果元素的数量非常巨大，例如有 1000 万个，还是会卡顿。
                    if (dTime > 15) {
                        break;
                    }
                }
            }

            layer.__drawIndex = i;

            if (layer.__drawIndex < layer.__endIndex) {
                finished = false;
            }

            if (scope.prevElClipPaths) {
                // Needs restore the state. If last drawn element is in the clipping area.
                ctx.restore();
            }

            ctx.restore();
        }

        if (env.wxa) {
            // Flush for weixin application
            dataUtil.each(this._layers, function (layer) {
                if (layer && layer.ctx && layer.ctx.draw) {
                    layer.ctx.draw();
                }
            });
        }

        return finished;
    }

    /**
     * @private
     * @method _doPaintEl
     * @param {*} el 
     * @param {*} currentLayer 
     * @param {*} forcePaint 
     * @param {*} scope 
     */
    _doPaintEl(el, currentLayer, forcePaint, scope) {
        let ctx = currentLayer.ctx;
        let m = el.transform;
        if (
            (currentLayer.__dirty || forcePaint)
            // Ignore invisible element
            && !el.invisible
            // Ignore transparent element
            && el.style.opacity !== 0
            // Ignore scale 0 element, in some environment like node-canvas
            // Draw a scale 0 element can cause all following draw wrong
            // And applyTransform with scale 0 will cause set back transform failed.
            && !(m && !m[0] && !m[3])
            // Ignore culled element
            && !(el.culling && this.isDisplayableCulled(el, this._width, this._height))
        ) {
            let clipPaths = el.__clipPaths;
            let prevElClipPaths = scope.prevElClipPaths;

            // Optimize when clipping on group with several elements
            if (!prevElClipPaths || this.isClipPathChanged(clipPaths, prevElClipPaths)) {
                // If has previous clipping state, restore from it
                if (prevElClipPaths) {
                    ctx.restore();
                    scope.prevElClipPaths = null;
                    // Reset prevEl since context has been restored
                    scope.prevEl = null;
                }
                // New clipping state
                if (clipPaths) {
                    ctx.save();
                    this.doClip(clipPaths, ctx);
                    scope.prevElClipPaths = clipPaths;
                }
            }

            el.ctx = ctx;
            el.prevEl = scope.prevEl || null;

            el.trigger("beforeRender",el);
            el.render();
            scope.prevEl = el;
            el.trigger("afterRender",el);
        }
    }

    /**
     * @method getLayer
     * Get the canvas layer of a qlevel, auto create a canvas layer when does not exist.
     * 
     * 
     * 获取 qlevel 所在层，如果不存在则会创建一个新的 canvas 层。
     * @param {Number} qlevel
     * @param {Boolean} virtual Virtual layer will not be inserted into dom.
     * @return {CanvasLayer}
     */
    getLayer(qlevel, virtual) {
        if (this._singleCanvas && !this._needsManuallyCompositing) {
            qlevel = CANVAS_QLEVEL;
        }
        let layer = this._layers[qlevel];
        if (!layer) {
            // Create a new layer
            layer = new CanvasLayer('topo_' + qlevel,this._width,this._height,this.dpr);
            layer.qlevel = qlevel;
            layer.__builtin__ = true;

            if (this._layerConfig[qlevel]) {
                dataUtil.merge(layer, this._layerConfig[qlevel], true);
            }

            if (virtual) {
                layer.virtual = virtual;
            }

            this.insertLayer(qlevel, layer);

            // Context is created after dom inserted to document
            // Or excanvas will get 0px clientWidth and clientHeight
            layer.initContext();
        }

        return layer;
    }

    /**
     * @method insertLayer
     * Insert one canvas layer dynamicly during runtime.
     * Do NOT use this method in Wechat mini-program, because we can neither get HTMLElement 
     * nor canvas instance.
     * 
     * 
     * 在运行时动态创建一个 canvas 层。
     * 在微信小程序中不要使用此方法，以为在小程序中无法获取 HTMLElement 或者 Canvas 实例。
     * @param {*} qlevel 
     * @param {*} layer 
     */
    insertLayer(qlevel, layer) {
        let layersMap = this._layers;
        let qlevelList = this._qlevelList;
        let len = qlevelList.length;
        let prevLayer = null;
        let i = -1;

        if (layersMap[qlevel]) {
            console.log('ZLevel ' + qlevel + ' has been used already');
            return;
        }
        // Check if is a valid layer
        if (!this.isLayerValid(layer)) {
            console.log('CanvasLayer of qlevel ' + qlevel + ' is not valid');
            return;
        }

        if (len > 0 && qlevel > qlevelList[0]) {
            for (i = 0; i < len - 1; i++) {
                if (
                    qlevelList[i] < qlevel
                    && qlevelList[i + 1] > qlevel
                ) {
                    break;
                }
            }
            prevLayer = layersMap[qlevelList[i]];
        }
        qlevelList.splice(i + 1, 0, qlevel);

        layersMap[qlevel] = layer;

        // Vitual layer will not directly show on the screen.
        // (It can be a WebGL layer and assigned to a QImage element)
        // But it still under management of fishTopo.
        if (!layer.virtual) {
            if (prevLayer) {
                let prevDom = prevLayer.canvasInstance;
                if (prevDom.nextSibling) {
                    this._host.insertBefore(
                        layer.canvasInstance,
                        prevDom.nextSibling
                    );
                }else {
                    this._host.appendChild(layer.canvasInstance);
                }
            }else {
                if (this._host.firstChild) {
                    this._host.insertBefore(layer.canvasInstance, this._host.firstChild);
                }else {
                    this._host.appendChild(layer.canvasInstance);
                }
            }
        }
    }

    /**
     * @method delLayer
     * @param {Number} qlevel
     */
    delLayer(qlevel) {
        let layers = this._layers;
        let qlevelList = this._qlevelList;
        let layer = layers[qlevel];
        if (!layer) {
            return;
        }
        if(layer.canvasInstance){
            layer.canvasInstance.parentNode.removeChild(layer.canvasInstance);
        }
        delete layers[qlevel];

        qlevelList.splice(dataUtil.indexOf(qlevelList, qlevel), 1);
    }

    /**
     * @private
     * @method eachLayer
     * Iterate each canvas layer.
     * 
     * 
     * 遍历所有画布层。
     * @param {Function} cb 
     * @param {Object} context 
     */
    eachLayer(cb, context) {
        let qlevelList = this._qlevelList;
        let z;
        let i;
        for (i = 0; i < qlevelList.length; i++) {
            z = qlevelList[i];
            cb.call(context, this._layers[z], z);
        }
    }

    /**
     * @private
     * @method eachBuiltinLayer
     * @param {Function} cb 
     * @param {Object} context 
     */
    eachBuiltinLayer(cb, context) {
        let qlevelList = this._qlevelList;
        let layer;
        let z;
        let i;
        for (i = 0; i < qlevelList.length; i++) {
            z = qlevelList[i];
            layer = this._layers[z];
            if (layer.__builtin__) {
                cb.call(context, layer, z);
            }
        }
    }

    /**
     * @private
     * @method eachOtherLayer
     * Iterate each other layer except buildin layer.
     * 
     * 
     * 遍历所有画布层，内置的层除外。
     * @param {Function} cb 
     * @param {Object} context 
     */
    eachOtherLayer(cb, context) {
        let qlevelList = this._qlevelList;
        let layer;
        let z;
        let i;
        for (i = 0; i < qlevelList.length; i++) {
            z = qlevelList[i];
            layer = this._layers[z];
            if (!layer.__builtin__) {
                cb.call(context, layer, z);
            }
        }
    }

    /**
     * @method getLayers
     * Get all the canvas layers.
     * 
     * 
     * 获取所有画布层。
     * @param {Array<CanvasLayer>} [prevLayer]
     */
    getLayers() {
        return this._layers;
    }

    /**
     * @private
     * @method _updateLayerStatus
     * @param {*} list 
     */
    _updateLayerStatus(list) {

        this.eachBuiltinLayer(function (layer) {
            layer.__dirty = layer.__used = false;
        });

        function updatePrevLayer(idx) {
            if (prevLayer) {
                if (prevLayer.__endIndex !== idx) {
                    prevLayer.__dirty = true;
                }
                prevLayer.__endIndex = idx;
            }
        }

        if (this._singleCanvas) {
            for (let i = 1; i < list.length; i++) {
                let el = list[i];
                if (el.qlevel !== list[i - 1].qlevel || el.incremental) {
                    this._needsManuallyCompositing = true;
                    break;
                }
            }
        }

        let prevLayer = null;
        let incrementalLayerCount = 0;
        let i = 0;
        for (;i < list.length; i++) {
            let el = list[i];
            let qlevel = el.qlevel;
            let layer;
            // PENDING If change one incremental element style ?
            // TODO Where there are non-incremental elements between incremental elements.
            if (el.incremental) {
                layer = this.getLayer(
                    qlevel + INCREMENTAL_INC, 
                    this._needsManuallyCompositing
                );
                layer.incremental = true;
                incrementalLayerCount = 1;
            }else {
                layer = this.getLayer(
                    qlevel + (incrementalLayerCount > 0 ? EL_AFTER_INCREMENTAL_INC : 0),
                    this._needsManuallyCompositing
                );
            }

            if (!layer.__builtin__) {
                console.log('ZLevel ' + qlevel + ' has been used by unkown layer ' + layer.id);
            }

            if (layer !== prevLayer) {
                layer.__used = true;
                if (layer.__startIndex !== i) {
                    layer.__dirty = true;
                }

                layer.__startIndex = i;
                if (!layer.incremental) {
                    layer.__drawIndex = i;
                }else {
                    layer.__drawIndex = -1;
                }

                updatePrevLayer(i);
                prevLayer = layer;
            }

            if (el.__dirty) {
                layer.__dirty = true;
                if (layer.incremental && layer.__drawIndex < 0) {
                    // Start draw from the first dirty element.
                    layer.__drawIndex = i;
                }
            }
        }

        updatePrevLayer(i);

        this.eachBuiltinLayer(function (layer) {
            // Used in last frame but not in this frame. Needs clear
            if (!layer.__used && layer.getElementCount() > 0) {
                layer.__dirty = true;
                layer.__startIndex = layer.__endIndex = layer.__drawIndex = 0;
            }
            // For incremental layer. In case start index changed and no elements are dirty.
            if (layer.__dirty && layer.__drawIndex < 0) {
                layer.__drawIndex = layer.__startIndex;
            }
        });
    }

    /**
     * @method clear
     */
    clear() {
        this.eachBuiltinLayer(this._clearLayer);
        return this;
    }

    /**
     * @private
     * @method _clearLayer
     */
    _clearLayer(layer) {
        layer.clear();
    }

    /**
     * @method setBackgroundColor
     */
    setBackgroundColor(backgroundColor) {
        this._backgroundColor = backgroundColor;
    }

    /**
     * @method configLayer
     *
     * @param {String} qlevel
     * @param {Object} [config]
     * @param {String} [config.clearColor=0]
     * @param {String} [config.motionBlur=false]
     * @param {Number} [config.lastFrameAlpha=0.7]
     */
    configLayer(qlevel, config) {
        if (config) {
            let layerConfig = this._layerConfig;
            if (!layerConfig[qlevel]) {
                layerConfig[qlevel] = config;
            }else {
                dataUtil.merge(layerConfig[qlevel], config, true);
            }

            for (let i = 0; i < this._qlevelList.length; i++) {
                let _zlevel = this._qlevelList[i];
                if (_zlevel === qlevel || _zlevel === qlevel + EL_AFTER_INCREMENTAL_INC) {
                    let layer = this._layers[_zlevel];
                    dataUtil.merge(layer, layerConfig[qlevel], true);
                }
            }
        }
    }

    /**
     * @method resize
     * @param {Number} width
     * @param {Number} height
     */
    resize(width, height) {
        if (!this._host.style) { // Maybe in node or worker or Wechat
            if (width == null || height == null) {
                return;
            }
            this._width = width;
            this._height = height;
            this.getLayer(CANVAS_QLEVEL).resize(width, height);
        }else {
            let domRoot = this._host;
            domRoot.style.display = 'none';

            // Save input w/h
            let options = this.options;
            width != null && (options.width = width);
            height != null && (options.height = height);

            width = this._getSize(0);
            height = this._getSize(1);

            domRoot.style.display = '';

            // 优化没有实际改变的resize
            if (this._width !== width || height !== this._height) {
                domRoot.style.width = width + 'px';
                domRoot.style.height = height + 'px';

                for (let id in this._layers) {
                    if (this._layers.hasOwnProperty(id)) {
                        this._layers[id].resize(width, height);
                    }
                }
                dataUtil.each(this._progressiveLayers, function (layer) {
                    layer.resize(width, height);
                });

                this.refresh(true);
            }

            this._width = width;
            this._height = height;
        }
        return this;
    }

    /**
     * @method clearLayer
     * @param {Number} qlevel
     */
    clearLayer(qlevel) {
        let layer = this._layers[qlevel];
        if (layer) {
            layer.clear();
        }
    }

    /**
     * @method dispose
     */
    dispose() {
        this.host.innerHTML = '';
        this.host = null;
        this.storage = null;
        this._host = null;
        this._layers = null;
    }

    /**
     * @method getRenderedCanvas
     * Get canvas which has all thing rendered.
     * Do NOT use this method in Wechat mini-program, because we can not get HTMLElement 
     * nor canvas instance.
     * @param {Object} [options]
     * @param {String} [options.backgroundColor]
     * @param {Number} [options.pixelRatio]
     */
    getRenderedCanvas(options={}) {
        if (this._singleCanvas && !this._compositeManually) {
            return this._layers[CANVAS_QLEVEL].canvasInstance;
        }

        let imageLayer = new CanvasLayer('image',this._width,this._height,options.pixelRatio || this.dpr);
        imageLayer.initContext();
        imageLayer.clear(false, options.backgroundColor || this._backgroundColor);

        if (options.pixelRatio <= this.dpr) {
            this.refresh();
            let width = imageLayer.canvasInstance.width;
            let height = imageLayer.canvasInstance.height;
            let ctx = imageLayer.ctx;
            this.eachLayer(function (layer) {
                if (layer.__builtin__) {
                    ctx.drawImage(layer.canvasInstance, 0, 0, width, height);
                }else if (layer.renderToCanvas) {
                    imageLayer.ctx.save();
                    layer.renderToCanvas(imageLayer.ctx);
                    imageLayer.ctx.restore();
                }
            });
        }else {
            // PENDING, echarts-gl and incremental rendering.
            let scope = {};
            let displayList = this.storage.getDisplayList(true);
            for (let i = 0; i < displayList.length; i++) {
                let el = displayList[i];
                this._doPaintEl(el, imageLayer, true, scope);
            }
        }
        return imageLayer.canvasInstance;
    }

    /**
     * @method getWidth
     * @return {Number}
     */
    getWidth() {
        return this._width;
    }

    /**
     * @method getHeight
     * @return {Number}
     */
    getHeight() {
        return this._height;
    }

    /**
     * @method _getSize
     * Do NOT use this method in Wechat mini-program, because we can not get HTMLElement 
     * nor canvas instance.
     * @param {*} whIdx 
     */
    _getSize(whIdx) {
        let options = this.options;
        let wh = ['width', 'height'][whIdx];
        let cwh = ['clientWidth', 'clientHeight'][whIdx];
        let plt = ['paddingLeft', 'paddingTop'][whIdx];
        let prb = ['paddingRight', 'paddingBottom'][whIdx];

        if (options[wh] != null && options[wh] !== 'auto') {
            return parseFloat(options[wh]);
        }

        // IE8 does not support getComputedStyle, but it use VML.
        let stl = document.defaultView.getComputedStyle(this.host);

        return (
            (this.host[cwh] || dataUtil.parseInt10(stl[wh]) || dataUtil.parseInt10(this.host.style[wh]))
            - (dataUtil.parseInt10(stl[plt]) || 0)
            - (dataUtil.parseInt10(stl[prb]) || 0)
        ) | 0;
    }

    /**
     * @method pathToImage
     * @param {*} path 
     * @param {*} dpr 
     */
    pathToImage(path, dpr) {
        dpr = dpr || this.dpr;

        let canvas = canvasUtil.createCanvas();//创建隐藏的 canvas，在内存中。
        let ctx = canvasUtil.getContext(canvas);
        let rect = path.getBoundingRect();
        let style = path.style;
        let shadowBlurSize = style.shadowBlur * dpr;
        let shadowOffsetX = style.shadowOffsetX * dpr;
        let shadowOffsetY = style.shadowOffsetY * dpr;
        let lineWidth = style.hasStroke() ? style.lineWidth : 0;

        let leftMargin = mathMax(lineWidth / 2, -shadowOffsetX + shadowBlurSize);
        let rightMargin = mathMax(lineWidth / 2, shadowOffsetX + shadowBlurSize);
        let topMargin = mathMax(lineWidth / 2, -shadowOffsetY + shadowBlurSize);
        let bottomMargin = mathMax(lineWidth / 2, shadowOffsetY + shadowBlurSize);
        let width = rect.width + leftMargin + rightMargin;
        let height = rect.height + topMargin + bottomMargin;

        canvas.width = width * dpr;
        canvas.height = height * dpr;

        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);
        ctx.dpr = dpr;

        let pathTransform = {
            position: path.position,
            rotation: path.rotation,
            scale: path.scale
        };
        path.position = [leftMargin - rect.x1, topMargin - rect.y1];
        path.rotation = 0;
        path.scale = [1,1];
        path.skew = [0,0];
        path.composeParentTransform();
        if (path) {
            path.ctx = ctx;
            path.render();
        }

        let img = new Image({
            style: {
                x: 0,
                y: 0,
                image: canvas
            }
        });

        if (pathTransform.position != null) {
            img.position = path.position = pathTransform.position;
        }

        if (pathTransform.rotation != null) {
            img.rotation = path.rotation = pathTransform.rotation;
        }

        if (pathTransform.scale != null) {
            img.scale = path.scale = pathTransform.scale;
        }

        return img;
    }

    /**
     * @private
     * @method isLayerValid
     * @param {*} layer 
     */
    isLayerValid(layer) {
        if (!layer){
            return false;
        }
        if (layer.__builtin__){
            return true;
        }
        if (typeof (layer.resize) !== 'function'
            || typeof (layer.refresh) !== 'function'){
            return false;
        }
        return true;
    }

    /**
     * @private
     * @method isDisplayableCulled
     * @param {*} el 
     * @param {*} width 
     * @param {*} height 
     */
    isDisplayableCulled(el, width, height) {
        this._tmpRect.copy(el.getBoundingRect());
        if (el.transform) {
            this._tmpRect.applyTransform(el.transform);
        }
        this._viewRect.width = width;
        this._viewRect.height = height;
        return !this._tmpRect.intersect(this._viewRect);
    }

    /**
     * @private
     * @method isClipPathChanged
     * @param {*} clipPaths 
     * @param {*} prevClipPaths 
     */
    isClipPathChanged(clipPaths, prevClipPaths) {
        // displayable.__clipPaths can only be `null`/`undefined` or an non-empty array.
        if (clipPaths === prevClipPaths) {
            return false;
        }

        if (!clipPaths || !prevClipPaths || (clipPaths.length !== prevClipPaths.length)) {
            return true;
        }

        for (let i = 0; i < clipPaths.length; i++) {
            if (clipPaths[i] !== prevClipPaths[i]) {
                return true;
            }
        }
        return false;
    }

    /**
     * @private
     * @method doClip
     * @param {*} clipPaths 
     * @param {*} ctx 
     */
    doClip(clipPaths, ctx) {
        clipPaths.forEach((clipPath)=>{
            clipPath.applyTransform(ctx);
            ctx.beginPath();
            clipPath.buildPath(ctx, clipPath.shape);
            ctx.clip();
            clipPath.restoreTransform(ctx);
        });
    }

    /**
     * @private
     * @method createDomRoot
     * In the browser environment, we will not insert the canvas markup into the dom directly but into a nested div.
     * The purpose for doing this is to add some necessary CSS sytles, facilitate the implementation of specific functions.
     * 
     * 
     * 在浏览器环境中，不会直接插入 canvas 标签，而是再内嵌一层div。
     * 这样做的目的是加上一些必要的 CSS 样式，方便实现特定的功能。
     * @param {Number} width 
     * @param {Number} height 
     */
    createDomRoot(width, height) {
        let domRoot = document.createElement('div');
        // IOS13 safari probably has a compositing bug (z order of the canvas and the consequent
        // dom does not act as expected) when some of the parent dom has
        // `-webkit-overflow-scrolling: touch;` and the webpage is longer than one screen and
        // the canvas is not at the top part of the page.
        // Check `https://bugs.webkit.org/show_bug.cgi?id=203681` for more details. We remove
        // this `overflow:hidden` to avoid the bug.
        // 'overflow:hidden',
        domRoot.style.cssText = [
            'position:relative',
            'width:' + width + 'px',
            'height:' + height + 'px',
            'padding:0',
            'margin:0',
            'border-width:0'
        ].join(';') + ';';

        return domRoot;
    }
}