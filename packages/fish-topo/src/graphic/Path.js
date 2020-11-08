/* eslint-disable no-unused-vars */
import * as dataUtil from '../utils/data_structure_util';
import * as classUtil from '../utils/class_util';
import * as pathContain from '../utils/contain/path';
import {mathMax,mathAbs,mathSqrt} from '../utils/constants';
import Element from './Element';
import PathProxy from './PathProxy';
import Pattern from './Pattern';

/**
 * @class fishTopo.graphic.Path 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
class Path extends Element{
    /**
     * @method constructor Path
     * @param {Object} options
     */
    constructor(options){
        super(options);

        /**
         * @property {String} type
         */
        this.type='path';

        /**
         * @property {PathProxy}
         * @readonly
         */
        this.path = null;

        /**
         * @property {Number} strokeContainThreshold
         */
        this.strokeContainThreshold=5;

        /**
         * @property {Number} segmentIgnoreThreshold
         * This item default to be false. But in map series in echarts,
         * in order to improve performance, it should be set to true,
         * so the shorty segment won't draw.
         */
        this.segmentIgnoreThreshold=0;
    
        /**
         * @property {Boolean} subPixelOptimize
         * See `subPixelOptimize`.
         */
        this.subPixelOptimize=false;

        /**
         * @private
         * @property __dirtyPath
         */
        this.__dirtyPath=true;
    }

    /**
     * @method render
     */
    render() {
        let ctx=this.ctx;
        let prevEl=this.prevEl;

        let path = this.path || new PathProxy(true);
        let hasStroke = this.style.hasStroke();
        let hasFill = this.style.hasFill();
        let fill = this.style.fill;
        let stroke = this.style.stroke;
        let hasFillGradient = hasFill && !!(fill.colorStops);
        let hasStrokeGradient = hasStroke && !!(stroke.colorStops);
        let hasFillPattern = hasFill && !!(fill.image);
        let hasStrokePattern = hasStroke && !!(stroke.image);

        this.style.bind(ctx, this, prevEl);
        this.applyTransform(ctx);

        if (this.__dirty) {
            let rect;
            // Update gradient because bounding rect may changed
            if (hasFillGradient) {
                rect = rect || this.getBoundingRect();
                this._fillGradient = this.style.getGradient(ctx, fill, rect);
            }
            if (hasStrokeGradient) {
                rect = rect || this.getBoundingRect();
                this._strokeGradient = this.style.getGradient(ctx, stroke, rect);
            }
        }

        // Use the gradient or pattern
        if (hasFillGradient) {
            // PENDING If may have affect the state
            ctx.fillStyle = this._fillGradient;
        }else if (hasFillPattern) {
            ctx.fillStyle = Pattern.prototype.getCanvasPattern.call(fill, ctx);
        }

        if (hasStrokeGradient) {
            ctx.strokeStyle = this._strokeGradient;
        }else if (hasStrokePattern) {
            ctx.strokeStyle = Pattern.prototype.getCanvasPattern.call(stroke, ctx);
        }

        let lineDash = this.style.lineDash;
        let lineDashOffset = this.style.lineDashOffset;
        let ctxLineDash = !!ctx.setLineDash;

        // Update path sx, sy
        let scale = this.getGlobalScale();
        path.setScale(scale[0], scale[1], this.segmentIgnoreThreshold);

        // Proxy context
        // Rebuild path in following 2 cases
        // 1. Path is dirty
        // 2. Path needs javascript implemented lineDash stroking.
        //    In this case, lineDash information will not be saved in PathProxy
        if (this.__dirtyPath
            || (lineDash && !ctxLineDash && hasStroke)) {
            path.beginPath(ctx);
            // Setting line dash before build path
            if (lineDash && !ctxLineDash) {
                path.setLineDash(lineDash);
                path.setLineDashOffset(lineDashOffset);
            }
            this.buildPath(path, this.shape, false);
            // Clear path dirty flag
            if (this.path) {
                this.__dirtyPath = false;
            }
        }else {
            // Replay path building
            ctx.beginPath();
            this.path.rebuildPath(ctx);
        }

        if (hasFill) {
            if (this.style.fillOpacity != null) {
                let originalGlobalAlpha = ctx.globalAlpha;
                ctx.globalAlpha = this.style.fillOpacity * this.style.opacity;
                path.fill(ctx);
                ctx.globalAlpha = originalGlobalAlpha;
            }else {
                path.fill(ctx);
            }
        }

        if (lineDash && ctxLineDash) {
            ctx.setLineDash(lineDash);
            ctx.lineDashOffset = lineDashOffset;
        }

        if (hasStroke) {
            if (this.style.strokeOpacity != null) {
                let originalGlobalAlpha = ctx.globalAlpha;
                ctx.globalAlpha = this.style.strokeOpacity * this.style.opacity;
                path.stroke(ctx);
                ctx.globalAlpha = originalGlobalAlpha;
            }else {
                path.stroke(ctx);
            }
        }

        if (lineDash && ctxLineDash) {
            // PENDING
            // Remove lineDash
            ctx.setLineDash([]);
        }

        Element.prototype.render.call(this,ctx,prevEl);
    }

    /**
     * @method buildPath
     * 
     * Each subclass should provide its own implement for this method.
     * When build path, some shape may decide if use moveTo to begin a new subpath or closePath, like in circle.
     * 
     * 每个子类都需要为此方法提供自己的实现。
     * 在构建路径时，某些形状需要根据情况决定使用 moveTo 来开始一段子路径，或者直接用 closePath 来封闭路径，比如圆形。
     * 
     * @param {*} ctx 
     * @param {*} shapeCfg 
     * @param {*} inBundle 
     */
    buildPath(ctx, shapeCfg, inBundle) {}

    /**
     * @method createPathProxy
     */
    createPathProxy() {
        this.path = new PathProxy();
    }

    /**
     * @method getBoundingRect
     * Get bounding rect of this element, NOTE: 
     * this method will return the bounding rect without transforming(translate/scale/rotate/skew). 
     * However, direct modifications to the shape property will be reflected in the bouding-rect.
     * For example,  if we modify this.shape.width directly, then the new width property will be calculated.
     * 
     * 
     * 获取当前元素的边界矩形，注意：
     * 此方法返回的是没有经过 transform(translate/scale/rotate/skew) 处理的边界矩形，但是对 shape 属性直接进行的修改会反映在获取的边界矩形上。
     * 例如，用代码直接对 this.shape.width 进行赋值，那么在计算边界矩形时就会用新的 width 属性进行计算。
     */
    getBoundingRect() {
        let rect = this.__boundingRect;
        let needsUpdateRect = !rect;
        if (needsUpdateRect) {
            let path = this.path;
            if (!path) {
                // Create path on demand.
                path = this.path = new PathProxy();
            }
            if (this.__dirtyPath) {
                path.beginPath();
                this.buildPath(path, this.shape, false);
            }
            rect = path.getBoundingRect();
        }
        this.__boundingRect = rect;

        if (this.style.hasStroke()) {
            // Update rect with stroke lineWidth when
            // 1. Element changes scale or lineWidth
            // 2. Shape is changed
            let rectWithStroke = this._boundingRectWithStroke || (this._boundingRectWithStroke = rect.clone());
            if (this.__dirty || needsUpdateRect) {
                rectWithStroke.copy(rect);
                // FIXME Must after composeParentTransform
                let w = this.style.lineWidth;
                // PENDING, Min line width is needed when line is horizontal or vertical
                let lineScale = this.style.strokeNoScale ? this.getLineScale() : 1;

                // Only add extra hover lineWidth when there are no fill
                if (!this.style.hasFill()) {
                    w = mathMax(w, this.strokeContainThreshold || 4);
                }
                // Consider line width
                // Line scale can't be 0;
                if (lineScale > 1e-10) {
                    rectWithStroke.width += w / lineScale;
                    rectWithStroke.height += w / lineScale;
                    rectWithStroke.x1 -= w / lineScale / 2;
                    rectWithStroke.y1 -= w / lineScale / 2;
                    rectWithStroke.x2 = rectWithStroke.x1+rectWithStroke.width;
                    rectWithStroke.y2 = rectWithStroke.y1+rectWithStroke.height;
                }
            }

            // Return rect with stroke
            return rectWithStroke;
        }

        return rect;
    }

    /**
     * @method containPoint
     * @param {*} x 
     * @param {*} y 
     */
    containPoint(x, y) {
        let localPos = this.globalToLocal(x, y);
        let rect = this.getBoundingRect();
        let style = this.style;
        x = localPos[0];
        y = localPos[1];

        if (rect.containPoint(x, y)) {
            let pathData = this.path.data;
            if (style.hasStroke()) {
                let lineWidth = style.lineWidth;
                let lineScale = style.strokeNoScale ? this.getLineScale() : 1;
                // Line scale can't be 0;
                if (lineScale > 1e-10) {
                    // Only add extra hover lineWidth when there are no fill
                    if (!style.hasFill()) {
                        lineWidth = mathMax(lineWidth, this.strokeContainThreshold);
                    }
                    if (pathContain.containStroke(
                        pathData, lineWidth / lineScale, x, y
                    )) {
                        return true;
                    }
                }
            }
            if (style.hasFill()) {
                return pathContain.containPoint(pathData, x, y);
            }
        }
        return false;
    }

    /**
     * @protected
     * @method dirty
     * @param  {Boolean} dirtyPath
     */
    dirty(dirtyPath) {
        if (dirtyPath == null) {
            dirtyPath = true;
        }
        // Only mark dirty, not mark clean
        if (dirtyPath) {
            this.__dirtyPath = dirtyPath;
        }
        
        Element.prototype.dirty.call(this);

        // Used as a clipping path
        if (this.__clipTarget) {
            this.__clipTarget.dirty();
        }
    }
    
    /**
     * @method _attrKV
     * Overwrite _attrKV
     * @param {*} key 
     * @param {Object} value 
     */
    _attrKV(key, value) {
        // FIXME
        if (key === 'shape') {
            this.__dirtyPath = true;
            this.__boundingRect = null;
            this.setShape(value);
        }else {
            Element.prototype._attrKV.call(this, key, value);
        }
    }

    /**
     * @method setShape
     * @param {Object|String} key
     * @param {Object} value
     */
    setShape(key, value) {
        // Path from string may not have shape
        if(!this.shape){
            return this;
        }
        if (dataUtil.isObject(key)) {
            classUtil.copyOwnProperties(this.shape,key);
        }else {
            this.shape[key] = value;
        }
        this.dirty(true);
        return this;
    }

    /**
     * @method getLineScale
     */
    getLineScale() {
        let m = this.transform;
        // Get the line scale.
        // Determinant of `m` means how much the area is enlarged by the
        // transformation. So its square root can be used as a scale factor
        // for width.
        return m && mathAbs(m[0] - 1) > 1e-10 && mathAbs(m[3] - 1) > 1e-10
            ? mathSqrt(mathAbs(m[0] * m[3] - m[2] * m[1]))
            : 1;
    }
}

export default Path;