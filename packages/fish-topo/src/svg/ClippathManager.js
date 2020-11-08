import Definable from './Definable';
import * as dataUtil from '../utils/data_structure_util';
import * as matrixUtil from '../utils/affine_matrix_util';

/**
 * @class fishTopo.svg.helper.ClippathManager
 * 
 * Manages SVG clipPath elements.
 * 
 * @docauthor 大漠穷秋 damoqiongqiu@126.com
 */
class ClippathManager extends Definable{
    /**
     * @method constructor ClippathManager
     * @param   {Number}     topoId    fishTopo instance id
     * @param   {SVGElement} svgRoot root of SVG document
     */
    constructor(topoId, svgRoot){
        super(topoId, svgRoot, 'clipPath', '__clippath_in_use__');
    }

    /**
     * @method update
     * Update clipPath.
     *
     * @param {Displayable} displayable displayable element
     */
    update(displayable) {
        let svgEl = this.getSvgElement(displayable);
        if (svgEl) {
            this.updateDom(svgEl, displayable.__clipPaths, false);
        }
    
        let textEl = this.getTextSvgElement(displayable);
        if (textEl) {
            // Make another clipPath for text, since it's transform
            // matrix is not the same with svgElement
            this.updateDom(textEl, displayable.__clipPaths, true);
        }
    
        this.markUsed(displayable);
    }

    /**
     * @method updateDom
     * Create an SVGElement of displayable and create a <clipPath> of its
     * clipPath
     *
     * @param {Displayable} parentEl  parent element
     * @param {ClipPath[]}  clipPaths clipPaths of parent element
     * @param {Boolean}     isText    if parent element is Text
     */
    updateDom(parentEl,clipPaths,isText) {
        if (clipPaths && clipPaths.length > 0) {
            // Has clipPath, create <clipPath> with the first clipPath
            let defs = this.getDefs(true);
            let clipPath = clipPaths[0];
            let clipPathEl;
            let id;
    
            let dom = isText ? '_textDom' : '_dom';
    
            if (clipPath[dom]) {
                // Use a dom that is already in <defs>
                id = clipPath[dom].getAttribute('id');
                clipPathEl = clipPath[dom];
    
                // Use a dom that is already in <defs>
                if (!defs.contains(clipPathEl)) {
                    // This happens when set old clipPath that has
                    // been previously removed
                    defs.appendChild(clipPathEl);
                }
            }
            else {
                // New <clipPath>
                id = 'topo' + this._topoId + '-clip-' + this.nextId;
                ++this.nextId;
                clipPathEl = this.createElement('clipPath');
                clipPathEl.setAttribute('id', id);
                defs.appendChild(clipPathEl);
    
                clipPath[dom] = clipPathEl;
            }
    
            // Build path and add to <clipPath>
            let svgProxy = this.getSvgProxy(clipPath);
            if (clipPath.transform
                && clipPath.parent.inverseTransform
                && !isText
            ) {
                /**
                 * If a clipPath has a parent with transform, the transform
                 * of parent should not be considered when setting transform
                 * of clipPath. So we need to transform back from parent's
                 * transform, which is done by multiplying parent's inverse
                 * transform.
                 */
                // Store old transform
                let transform = Array.prototype.slice.call(
                    clipPath.transform
                );
    
                // Transform back from parent, and render path
                clipPath.transform=matrixUtil.mul(
                    clipPath.parent.inverseTransform,
                    clipPath.transform
                );
                svgProxy.render(clipPath);
    
                // Set back transform of clipPath
                clipPath.transform = transform;
            }
            else {
                svgProxy.render(clipPath);
            }
    
            let pathEl = this.getSvgElement(clipPath);
    
            clipPathEl.innerHTML = '';
            /**
             * Use `cloneNode()` here to appendChild to multiple parents,
             * which may happend when Text and other shapes are using the same
             * clipPath. Since Text will create an extra clipPath DOM due to
             * different transform rules.
             */
            clipPathEl.appendChild(pathEl.cloneNode());
    
            parentEl.setAttribute('clip-path', 'url(#' + id + ')');
    
            if (clipPaths.length > 1) {
                // Make the other clipPaths recursively
                this.updateDom(clipPathEl, clipPaths.slice(1), isText);
            }
        }
        else {
            // No clipPath
            if (parentEl) {
                parentEl.setAttribute('clip-path', 'none');
            }
        }
    }
    
    /**
     * @method markUsed
     * 
     * Mark a single clipPath to be used
     *
     * @param {Displayable} displayable displayable element
     */
    markUsed(displayable) {
        let that = this;
        // displayable.__clipPaths can only be `null`/`undefined` or an non-empty array.
        if (displayable.__clipPaths) {
            dataUtil.each(displayable.__clipPaths, function (clipPath) {
                if (clipPath._dom) {
                    Definable.prototype.markUsed.call(that, clipPath._dom);
                }
                if (clipPath._textDom) {
                    Definable.prototype.markUsed.call(that, clipPath._textDom);
                }
            });
        }
    }
}

export default ClippathManager;