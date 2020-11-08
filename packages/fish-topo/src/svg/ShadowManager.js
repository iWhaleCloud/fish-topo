import Definable from './Definable';

/**
 * @class fishTopo.svg.helper.ShadowManager
 * 
 * Manages SVG shadow elements.
 * 
 * @docauthor 大漠穷秋 damoqiongqiu@126.com
 */

function hasShadow(style) {
    // TODO: textBoxShadowBlur is not supported yet
    return style
        && (style.shadowBlur || style.shadowOffsetX || style.shadowOffsetY
            || style.textShadowBlur || style.textShadowOffsetX
            || style.textShadowOffsetY);
}

/**
 * @method constructor ShadowManager
 * 
 * Manages SVG shadow elements.
 *
 * @param   {Number}     topoId    fishTopo instance id
 * @param   {SVGElement} svgRoot root of SVG document
 */
class ShadowManager extends Definable{
    constructor(topoId, svgRoot){
        super(
            topoId,
            svgRoot,
            ['filter'],
            '__filter_in_use__',
            '_shadowDom'
        );
    }

    /**
     * Create new shadow DOM for fill or stroke if not exist,
     * but will not update shadow if exists.
     *
     * @param {SvgElement}  svgElement   SVG element to paint
     * @param {Displayable} displayable  fishTopo displayable element
     */
    addWithoutUpdate(svgElement,displayable) {
        if (displayable && hasShadow(displayable.style)) {
            // Create dom in <defs> if not exists
            let dom;
            if (displayable._shadowDom) {
                // Gradient exists
                dom = displayable._shadowDom;
                let defs = this.getDefs(true);
                if (!defs.contains(displayable._shadowDom)) {
                    // _shadowDom is no longer in defs, recreate
                    this.addDom(dom);
                }
            }else {
                // New dom
                dom = this.add(displayable);
            }

            this.markUsed(displayable);
            let id = dom.getAttribute('id');
            svgElement.style.filter = 'url(#' + id + ')';
        }
    }

    /**
     * Add a new shadow tag in <defs>
     *
     * @param {Displayable} displayable  fishTopo displayable element
     * @return {SVGFilterElement} created DOM
     */
    add(displayable) {
        let dom = this.createElement('filter');
        // Set dom id with shadow id, since each shadow instance
        // will have no more than one dom element.
        // id may exists before for those dirty elements, in which case
        // id should remain the same, and other attributes should be
        // updated.
        displayable._shadowDomId = displayable._shadowDomId || this.nextId++;
        dom.setAttribute('id', 'topo' + this._topoId
            + '-shadow-' + displayable._shadowDomId);
        this.updateDom(displayable, dom);
        this.addDom(dom);
        return dom;
    }

    /**
     * Update shadow.
     *
     * @param {Displayable} displayable  fishTopo displayable element
     */
    update(svgElement, displayable) {
        let style = displayable.style;
        if (hasShadow(style)) {
            let that = this;
            Definable.prototype.update.call(this, displayable, function () {
                that.updateDom(displayable, displayable._shadowDom);
            });
        }else {
            // Remove shadow
            this.remove(svgElement, displayable);
        }
    }

    /**
     * Remove DOM and clear parent filter
     */
    remove(svgElement, displayable) {
        if (displayable._shadowDomId != null) {
            this.removeDom(svgElement);
            svgElement.style.filter = '';
        }
    }

    /**
     * Update shadow dom
     *
     * @param {Displayable} displayable  fishTopo displayable element
     * @param {SVGFilterElement} dom DOM to update
     */
    updateDom(displayable, dom) {
        let domChild = dom.getElementsByTagName('feDropShadow');
        if (domChild.length === 0) {
            domChild = this.createElement('feDropShadow');
        }else {
            domChild = domChild[0];
        }

        let style = displayable.style;
        let scaleX = displayable.scale ? (displayable.scale[0] || 1) : 1;
        let scaleY = displayable.scale ? (displayable.scale[1] || 1) : 1;
        // TODO: textBoxShadowBlur is not supported yet
        let offsetX;
        let offsetY;
        let blur;
        let color;
        if (style.shadowBlur || style.shadowOffsetX || style.shadowOffsetY) {
            offsetX = style.shadowOffsetX || 0;
            offsetY = style.shadowOffsetY || 0;
            blur = style.shadowBlur;
            color = style.shadowColor;
        }else if (style.textShadowBlur) {
            offsetX = style.textShadowOffsetX || 0;
            offsetY = style.textShadowOffsetY || 0;
            blur = style.textShadowBlur;
            color = style.textShadowColor;
        }else {
            // Remove shadow
            this.removeDom(dom, style);
            return;
        }

        domChild.setAttribute('dx', offsetX / scaleX);
        domChild.setAttribute('dy', offsetY / scaleY);
        domChild.setAttribute('flood-color', color);

        // Divide by two here so that it looks the same as in canvas
        // See: https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-shadowblur
        let stdDx = blur / 2 / scaleX;
        let stdDy = blur / 2 / scaleY;
        let stdDeviation = stdDx + ' ' + stdDy;
        domChild.setAttribute('stdDeviation', stdDeviation);

        // Fix filter clipping problem
        dom.setAttribute('x', '-100%');
        dom.setAttribute('y', '-100%');
        dom.setAttribute('width', Math.ceil(blur / 2 * 200) + '%');
        dom.setAttribute('height', Math.ceil(blur / 2 * 200) + '%');
        
        dom.appendChild(domChild);
        // Store dom element in shadow, to avoid creating multiple
        // dom instances for the same shadow element
        displayable._shadowDom = dom;
    }

    /**
     * Mark a single shadow to be used
     *
     * @param {Displayable} displayable displayable element
     */
    markUsed(displayable) {
        if (displayable._shadowDom) {
            Definable.prototype.markUsed.call(this, displayable._shadowDom);
        }
    }
}

export default ShadowManager;
