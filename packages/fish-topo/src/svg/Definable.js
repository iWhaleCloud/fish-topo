import {createElement} from './core';
import * as dataUtil from '../utils/data_structure_util';
import Path from '../graphic/Path';
import QImage from '../graphic/Image';
import QText from '../graphic/Text';
import {
    path as svgPath,
    image as svgImage,
    text as svgText
} from './graphic';

/**
 * @class fishTopo.svg.helper.Definable
 * 
 * Manages elements that can be defined in <defs> in SVG,
 *       e.g., gradients, clip path, etc.
 * @docauthor 大漠穷秋 damoqiongqiu@126.com
 */

let MARK_UNUSED = '0';
let MARK_USED = '1';

class Definable{
    /**
     * @method constructor Definable
     * 
     * Manages elements that can be defined in <defs> in SVG,
     * e.g., gradients, clip path, etc.
     *
     * @param {Number}          topoId      fishTopo instance id
     * @param {SVGElement}      svgRoot   root of SVG document
     * @param {String|String[]} tagNames  possible tag names
     * @param {String}          markLabel label name to make if the element
     *                                    is used
     */
    constructor(topoId,svgRoot,tagNames,markLabel,domName) {
        this._topoId = topoId;
        this._svgRoot = svgRoot;
        this._tagNames = typeof tagNames === 'string' ? [tagNames] : tagNames;
        this._markLabel = markLabel;
        this._domName = domName || '_dom';
        this.nextId = 0;
        this.createElement=createElement;
    }

    /**
     * @method getDefs
     * 
     * Get the <defs> tag for svgRoot; optionally creates one if not exists.
     *
     * @param {Boolean} isForceCreating if need to create when not exists
     * @return {SVGDefsElement} SVG <defs> element, null if it doesn't exist and isForceCreating is false
     */
    getDefs(isForceCreating) {
        let svgRoot = this._svgRoot;
        let defs = this._svgRoot.getElementsByTagName('defs');
        if (defs.length === 0) {
            // Not exist
            if (isForceCreating) {
                defs = svgRoot.insertBefore(
                    this.createElement('defs'), // Create new tag
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
            }
            else {
                return null;
            }
        }
        else {
            return defs[0];
        }
    }

    /**
     * @method update
     * 
     * Update DOM element if necessary.
     *
     * @param {Object|String} element style element. e.g., for gradient, it may be '#ccc' or {type: 'linear', ...}
     * @param {Function|undefined} onUpdate update callback
     */
    update(element, onUpdate) {
        if (!element) {
            return;
        }
    
        let defs = this.getDefs(false);
        if (element[this._domName] && defs.contains(element[this._domName])) {
            // Update DOM
            if (typeof onUpdate === 'function') {
                onUpdate(element);
            }
        }else {
            // No previous dom, create new
            let dom = this.add(element);
            if (dom) {
                element[this._domName] = dom;
            }
        }
    }

    /**
     * @method addDom
     * 
     * Add gradient dom to defs
     *
     * @param {SVGElement} dom DOM to be added to <defs>
     */
    addDom(dom) {
        let defs = this.getDefs(true);
        defs.appendChild(dom);
    }

    /**
     * @method removeDom
     * 
     * Remove DOM of a given element.
     *
     * @param {SVGElement} element element to remove dom
     */
    removeDom(element) {
        let defs = this.getDefs(false);
        if (defs && element[this._domName]) {
            defs.removeChild(element[this._domName]);
            element[this._domName] = null;
        }
    }

    /**
     * @method getDoms
     * 
     * Get DOMs of this element.
     *
     * @return {HTMLDomElement} doms of this defineable elements in <defs>
     */
    getDoms() {
        let defs = this.getDefs(false);
        if (!defs) {
            // No dom when defs is not defined
            return [];
        }
    
        let doms = [];
        dataUtil.each(this._tagNames, function (tagName) {
            let tags = defs.getElementsByTagName(tagName);
            // Note that tags is HTMLCollection, which is array-like
            // rather than real array.
            // So `doms.concat(tags)` add tags as one object.
            doms = doms.concat([].slice.call(tags));
        });
    
        return doms;
    }

    /**
     * @method markAllUnused
     * 
     * Mark DOMs to be unused before painting, and clear unused ones at the end
     * of the painting.
     */
    markAllUnused() {
        let doms = this.getDoms();
        let that = this;
        dataUtil.each(doms, function (dom) {
            dom[that._markLabel] = MARK_UNUSED;
        });
    }

    /**
     * @method markUsed
     * 
     * Mark a single DOM to be used.
     *
     * @param {SVGElement} dom DOM to mark
     */
    markUsed(dom) {
        if (dom) {
            dom[this._markLabel] = MARK_USED;
        }
    }

    /**
     * @method removeUnused
     * 
     * Remove unused DOMs defined in <defs>
     */
    removeUnused() {
        let defs = this.getDefs(false);
        if (!defs) {
            // Nothing to remove
            return;
        }
    
        let doms = this.getDoms();
        let that = this;
        dataUtil.each(doms, function (dom) {
            if (dom[that._markLabel] !== MARK_USED) {
                // Remove gradient
                defs.removeChild(dom);
            }
        });
    }

    /**
     * @method getSvgProxy
     * 
     * Get SVG proxy.
     *
     * @param {Displayable} displayable displayable element
     * @return {Path|Image|Text} svg proxy of given element
     */
    getSvgProxy(displayable) {
        if (displayable instanceof Path) {
            return svgPath;
        }
        else if (displayable instanceof QImage) {
            return svgImage;
        }
        else if (displayable instanceof QText) {
            return svgText;
        }
        else {
            return svgPath;
        }
    }

    /**
     * @method getTextSvgElement
     * 
     * Get text SVG element.
     *
     * @param {Displayable} displayable displayable element
     * @return {SVGElement} SVG element of text
     */
    getTextSvgElement(displayable) {
        return displayable.__textSvgEl;
    }

    /**
     * @method getSvgElement
     * 
     * Get SVG element.
     *
     * @param {Displayable} displayable displayable element
     * @return {SVGElement} SVG element
     */
    getSvgElement(displayable) {
        return displayable.__svgEl;
    }
}
export default Definable;
