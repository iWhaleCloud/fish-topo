import * as vectorUtil from '../utils/vector_util';
import * as matrixUtil from '../utils/affine_matrix_util';
import {mathMin,mathMax} from '../utils/constants';

/**
 * @class fishTopo.core.BoundingRect
 * 
 * Bounding Rect.
 * 
 * 边界矩形。
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
let v2ApplyTransform = vectorUtil.applyTransform;
let lt = [];
let rb = [];
let lb = [];
let rt = [];

class BoundingRect{
    /**
     * @method constructor BoundingRect
     */
    constructor(x1=0, y1=0, x2=0, y2=0, width=0, height=0){
        /**
         * @property {Number}
         */
        this.x1 = x1;
        /**
         * @property {Number}
         */
        this.y1 = y1;
        /**
         * @property {Number}
         */
        this.x2 = x2;
        /**
         * @property {Number}
         */
        this.y2 = y2;
        /**
         * @property {Number}
         */
        this.width = width;
        /**
         * @property {Number}
         */
        this.height = height;
    }

    /**
     * @param {Object|BoundingRect} rect
     * @param {Number} rect.x1
     * @param {Number} rect.y1
     * @param {Number} rect.x2
     * @param {Number} rect.y2
     * @param {Number} rect.width
     * @param {Number} rect.height
     * @return {BoundingRect}
     */
    static create(rect) {
        return new BoundingRect(rect.x1, rect.y1, rect.x2, rect.y2, rect.width, rect.height);
    }

    /**
     * @method union
     * @param {BoundingRect} other
     */
    union(other) {
        this.x1 = mathMin(other.x1, this.x1);
        this.y1 = mathMin(other.y1, this.y1);
        this.x2 = mathMax(other.x2, this.x2);
        this.y2 = mathMax(other.y2, this.y2);
        this.width = this.x2-this.x1;
        this.height = this.y2-this.y1;
    }

    /**
     * @method applyTransform
     * @param {Array<Number>}
     */
    applyTransform(m) {
        // In case usage like this
        // el.getBoundingRect().applyTransform(el.transform)
        // And element has no transform
        if (!m) {
            return;
        }
        lt[0] = lb[0] = this.x1;
        lt[1] = rt[1] = this.y1;
        rb[0] = rt[0] = this.x2;
        rb[1] = lb[1] = this.y2;

        v2ApplyTransform(lt, lt, m);
        v2ApplyTransform(rb, rb, m);
        v2ApplyTransform(lb, lb, m);
        v2ApplyTransform(rt, rt, m);

        this.x1 = mathMin(lt[0], rb[0], lb[0], rt[0]);
        this.y1 = mathMin(lt[1], rb[1], lb[1], rt[1]);
        this.x2 = mathMax(lt[0], rb[0], lb[0], rt[0]);
        this.y2 = mathMax(lt[1], rb[1], lb[1], rt[1]);
        this.width = this.x2 - this.x1;
        this.height = this.y2 - this.y1;
    }

    /**
     * @method calculateTransform
     * Calculate matrix of transforming from self to target rect
     * @param  {BoundingRect} b
     * @return {Array<Number>}
     */
    calculateTransform(b) {
        let a = this;
        let sx = b.width / a.width;
        let sy = b.height / a.height;

        let m = matrixUtil.create();
        m = matrixUtil.translate(m, [-a.x1, -a.y1]);
        m = matrixUtil.scale(m, [sx, sy]);
        m = matrixUtil.translate(m, [b.x1, b.y1]);
        return m;
    }

    /**
     * @method intersect
     * @param {(BoundingRect|Object)} b
     * @return {Boolean}
     */
    intersect(b) {
        if (!b) {
            return false;
        }

        if (!(b instanceof BoundingRect)) {
            // Normalize negative width/height.
            b = BoundingRect.create(b);
        }

        let a = this;
        let ax0 = a.x1;
        let ax1 = a.x2;
        let ay0 = a.y1;
        let ay1 = a.y2;

        let bx0 = b.x1;
        let bx1 = b.x2;
        let by0 = b.y1;
        let by1 = b.y2;

        return !(ax1 < bx0 || bx1 < ax0 || ay1 < by0 || by1 < ay0);
    }

    /**
     * @method containPoint
     * @param {*} x 
     * @param {*} y 
     */
    containPoint(x, y) {
        let rect = this;
        return x >= rect.x1
            && x <= rect.x2
            && y >= rect.y1
            && y <= rect.y2;
    }

    /**
     * @method clone
     * @return {BoundingRect}
     */
    clone() {
        return new BoundingRect(this.x1, this.y1, this.x2, this.y2, this.width, this.height);
    }

    /**
     * @method copy
     * Copy from another rect
     * @param other
     */
    copy(other) {
        this.x1 = other.x1;
        this.y1 = other.y1;
        this.x2 = other.x2;
        this.y2 = other.y2;
        this.width = other.width;
        this.height = other.height;
    }
}

export default BoundingRect;