/* eslint-disable no-unused-vars */
import {createElement} from './core';
import * as dataUtil from '../utils/data_structure_util';
import Path from '../graphic/Path';
import QImage from '../graphic/Image';
import QText from '../graphic/Text';
import arrayDiff from '../utils/array_diff2';
import GradientManager from './GradientManager';
import ClippathManager from './ClippathManager';
import ShadowManager from './ShadowManager';
import {
    path as svgPath,
    image as svgImage,
    text as svgText
} from './graphic';

/**
 * @class fishTopo.svg.SVGPainter
 * 
 * SVG 画笔。
 * 
 * @docauthor 大漠穷秋 damoqiongqiu@126.com
 */

/**
 * @private
 * @method getSvgProxy
 * 
 * QImage 映射成 svgImage，ZText 映射成 svgText，其它所有都映射成 svgPath。
 * 
 * @param {Element} el 
 */
function getSvgProxy(el) {
    if (el instanceof Path) {
        return svgPath;
    }else if (el instanceof QImage) {
        return svgImage;
    }else if (el instanceof QText) {
        return svgText;
    }
    return svgPath;
}

function checkParentAvailable(parent, child) {
    return child && parent && child.parentNode !== parent;
}

function insertAfter(parent, child, prevSibling) {
    if (checkParentAvailable(parent, child) && prevSibling) {
        let nextSibling = prevSibling.nextSibling;
        nextSibling ? parent.insertBefore(child, nextSibling)
            : parent.appendChild(child);
    }
}

function prepend(parent, child) {
    if (checkParentAvailable(parent, child)) {
        let firstChild = parent.firstChild;
        firstChild ? parent.insertBefore(child, firstChild)
            : parent.appendChild(child);
    }
}

function remove(parent, child) {
    if (child && parent && child.parentNode === parent) {
        parent.removeChild(child);
    }
}

function getTextSvgElement(displayable) {
    return displayable.__textSvgEl;
}

function getSvgElement(displayable) {
    return displayable.__svgEl;
}

/**
 * @method constructor SVGPainter
 * @param {HTMLElement} host
 * @param {fishTopo.core.Storage} storage
 * @param {Object} opts
 */
let SVGPainter = function (host, storage, opts={}, topoId) {
    opts = dataUtil.extend({}, opts);
    this._opts = opts;
    this.host = host;
    this.storage = storage;
    this._visibleList = [];

    let svgRoot = createElement('svg');
    svgRoot.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgRoot.setAttribute('version', '1.1');
    svgRoot.setAttribute('baseProfile', 'full');
    svgRoot.style.cssText = 'user-select:none;position:absolute;left:0;top:0;';
    this.gradientManager = new GradientManager(topoId, svgRoot);
    this.clipPathManager = new ClippathManager(topoId, svgRoot);
    this.shadowManager = new ShadowManager(topoId, svgRoot);
    this._svgRoot = svgRoot;

    let div = document.createElement('div');
    div.style.cssText = 'overflow:hidden;position:relative';
    this._host = div;
    this.host.appendChild(div);
    this._host.appendChild(svgRoot);

    this.resize(opts.width, opts.height);
};

SVGPainter.prototype = {

    constructor: SVGPainter,

    /**
     * @method getType
     */
    getType: function () {
        return 'svg';
    },

    /**
     * @method getHost
     */
    getHost: function () {
        return this._host;
    },

    /**
     * @method getViewportRootOffset
     */
    getViewportRootOffset: function () {
        let viewportRoot = this.getViewportRoot();
        if (viewportRoot) {
            return {
                offsetLeft: viewportRoot.offsetLeft || 0,
                offsetTop: viewportRoot.offsetTop || 0
            };
        }
    },

    /**
     * @method refresh
     */
    refresh: function () {
        let list = this.storage.getDisplayList(true);
        this._paintList(list);
    },

    /**
     * @method setBackgroundColor
     */
    setBackgroundColor: function (backgroundColor) {
        // TODO gradient
        this._host.style.background = backgroundColor;
    },

    /**
     * @private
     * @method _paintList
     */
    _paintList: function (list) {
        this.gradientManager.markAllUnused();
        this.clipPathManager.markAllUnused();
        this.shadowManager.markAllUnused();

        let svgRoot = this._svgRoot;
        let visibleList = this._visibleList;
        let listLen = list.length;

        let newVisibleList = [];
        let i;
        let svgElement;
        let textSvgElement;
        for (i = 0; i < listLen; i++) {
            let displayable = list[i];
            let svgProxy = getSvgProxy(displayable);
            svgElement = getSvgElement(displayable)
                || getTextSvgElement(displayable);
            if (!displayable.invisible) {
                if (displayable.__dirty) {
                    svgProxy && svgProxy.render(displayable);

                    // Update clipPath
                    this.clipPathManager.update(displayable);

                    // Update gradient and shadow
                    if (displayable.style.fill&&displayable.style.stroke) {
                        this.gradientManager.update(displayable.style.fill);
                        this.gradientManager.update(displayable.style.stroke);
                    }
                    
                    this.shadowManager.update(svgElement, displayable);
                    displayable.__dirty = false;
                }
                newVisibleList.push(displayable);
            }
        }

        let diff = arrayDiff(visibleList, newVisibleList);
        let prevSvgElement;

        // First do remove, in case element moved to the head and do remove
        // after add
        for (i = 0; i < diff.length; i++) {
            let item = diff[i];
            if (item.removed) {
                for (let k = 0; k < item.count; k++) {
                    let displayable = visibleList[item.indices[k]];
                    svgElement = getSvgElement(displayable);
                    textSvgElement = getTextSvgElement(displayable);
                    remove(svgRoot, svgElement);
                    remove(svgRoot, textSvgElement);
                }
            }
        }
        for (i = 0; i < diff.length; i++) {
            let item = diff[i];
            if (item.added) {
                for (let k = 0; k < item.count; k++) {
                    let displayable = newVisibleList[item.indices[k]];
                    svgElement = getSvgElement(displayable);
                    textSvgElement = getTextSvgElement(displayable);
                    prevSvgElement
                        ? insertAfter(svgRoot, svgElement, prevSvgElement)
                        : prepend(svgRoot, svgElement);
                    if (svgElement) {
                        insertAfter(svgRoot, textSvgElement, svgElement);
                    }else if (prevSvgElement) {
                        insertAfter(svgRoot, textSvgElement, prevSvgElement);
                    }else {
                        prepend(svgRoot, textSvgElement);
                    }
                    // Insert text
                    insertAfter(svgRoot, textSvgElement, svgElement);
                    prevSvgElement = textSvgElement || svgElement
                        || prevSvgElement;

                    // fishTopo.Text only create textSvgElement.
                    this.gradientManager.addWithoutUpdate(svgElement || textSvgElement, displayable);
                    this.shadowManager.addWithoutUpdate(svgElement || textSvgElement, displayable);
                    this.clipPathManager.markUsed(displayable);
                }
            }else if (!item.removed) {
                for (let k = 0; k < item.count; k++) {
                    let displayable = newVisibleList[item.indices[k]];
                    svgElement = getSvgElement(displayable);
                    textSvgElement = getTextSvgElement(displayable);

                    svgElement = getSvgElement(displayable);
                    textSvgElement = getTextSvgElement(displayable);

                    this.gradientManager.markUsed(displayable);
                    this.gradientManager.addWithoutUpdate(svgElement || textSvgElement, displayable);

                    this.shadowManager.markUsed(displayable);
                    this.shadowManager.addWithoutUpdate(svgElement || textSvgElement, displayable);

                    this.clipPathManager.markUsed(displayable);

                    if (textSvgElement) { // Insert text.
                        insertAfter(svgRoot, textSvgElement, svgElement);
                    }
                    prevSvgElement = svgElement || textSvgElement || prevSvgElement;
                }
            }
        }

        this.gradientManager.removeUnused();
        this.clipPathManager.removeUnused();
        this.shadowManager.removeUnused();

        this._visibleList = newVisibleList;
    },

    /**
     * @private
     * @method _paintList
     */
    _getDefs: function (isForceCreating) {
        let svgRoot = this._svgRoot;
        let defs = this._svgRoot.getElementsByTagName('defs');
        if(defs.length!==0){
            return defs[0];
        }
        
        // Not exist
        if(!isForceCreating){
            return null;
        }
        defs = svgRoot.insertBefore(
            createElement('defs'), // Create new tag
            svgRoot.firstChild // Insert in the front of svg
        );
        if (!defs.contains) {
            // IE doesn't support contains method
            defs.contains = function (el) {
                let children = defs.children;
                if (!children) {
                    return false;
                }
                for (let i = children.length - 1; i >= 0; --i) {
                    if (children[i] === el) {
                        return true;
                    }
                }
                return false;
            };
        }
        return defs;
    },

    /**
     * @method resize
     */
    resize: function (width, height) {
        let viewport = this._host;
        // FIXME Why ?
        viewport.style.display = 'none';

        // Save input w/h
        let opts = this._opts;
        width != null && (opts.width = width);
        height != null && (opts.height = height);

        width = this._getSize(0);
        height = this._getSize(1);

        viewport.style.display = '';

        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;

            let viewportStyle = viewport.style;
            viewportStyle.width = width + 'px';
            viewportStyle.height = height + 'px';

            let svgRoot = this._svgRoot;
            // Set width by 'svgRoot.width = width' is invalid
            svgRoot.setAttribute('width', width);
            svgRoot.setAttribute('height', height);
        }
    },

    /**
     * @method getWidth
     * 获取绘图区域宽度
     */
    getWidth: function () {
        return this._width;
    },

    /**
     * @method getHeight
     * 获取绘图区域高度
     */
    getHeight: function () {
        return this._height;
    },

    /**
     * @private
     * @method _getSize
     */
    _getSize: function (whIdx) {
        let opts = this._opts;
        let wh = ['width', 'height'][whIdx];
        let cwh = ['clientWidth', 'clientHeight'][whIdx];
        let plt = ['paddingLeft', 'paddingTop'][whIdx];
        let prb = ['paddingRight', 'paddingBottom'][whIdx];

        if (opts[wh] != null && opts[wh] !== 'auto') {
            return parseFloat(opts[wh]);
        }

        let host = this.host;
        // IE8 does not support getComputedStyle, but it use VML.
        let stl = document.defaultView.getComputedStyle(host);

        return (
            (host[cwh] || dataUtil.parseInt10(stl[wh]) || dataUtil.parseInt10(host.style[wh]))
            - (dataUtil.parseInt10(stl[plt]) || 0)
            - (dataUtil.parseInt10(stl[prb]) || 0)
        ) | 0;
    },

    /**
     * @method dispose
     */
    dispose: function () {
        this.host.innerHTML = '';

        this._svgRoot =
            this._host =
            this.storage =
            null;
    },

    /**
     * @method clear
     */
    clear: function () {
        if (this._host) {
            this.host.removeChild(this._host);
        }
    },

    /**
     * @method pathToDataUrl
     */
    pathToDataUrl: function () {
        this.refresh();
        let html = this._svgRoot.outerHTML;
        return 'data:image/svg+xml;charset=UTF-8,' + html;
    }
};

// Not supported methods
function createMethodNotSupport(method) {
    return function () {
        console.log('In SVG mode painter not support method "' + method + '"');
    };
}

// Unsuppoted methods
[
    'getLayer', 'insertLayer', 'eachLayer', 'eachBuiltinLayer',
    'eachOtherLayer', 'getLayers', 'modLayer', 'delLayer', 'clearLayer',
    'toDataURL', 'pathToImage'
].forEach((name,index)=>{
    SVGPainter.prototype[name] = createMethodNotSupport(name);
});

export default SVGPainter;