import Line from './Line';
import * as vectorUtil from '../../utils/vector_util';
import * as curveUtil from '../../utils/curve_util';
import * as dataUtil from '../../utils/data_structure_util';

/**
 * @class fishTopo.graphic.shape.BezierCurve
 * BezierCurve.
 * 
 *  
 * 贝塞尔曲线。
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
let out = [];

function someVectorAt(shape, t, isTangent) {
    let cpx2 = shape.cpx2;
    let cpy2 = shape.cpy2;
    if (cpx2 === null || cpy2 === null) {
        return [
            (isTangent ? curveUtil.cubicDerivativeAt : curveUtil.cubicAt)(shape.x1, shape.cpx1, shape.cpx2, shape.x2, t),
            (isTangent ? curveUtil.cubicDerivativeAt : curveUtil.cubicAt)(shape.y1, shape.cpy1, shape.cpy2, shape.y2, t)
        ];
    }else {
        return [
            (isTangent ? curveUtil.quadraticDerivativeAt : curveUtil.quadraticAt)(shape.x1, shape.cpx1, shape.x2, t),
            (isTangent ? curveUtil.quadraticDerivativeAt : curveUtil.quadraticAt)(shape.y1, shape.cpy1, shape.y2, t)
        ];
    }
}

export default class BezierCurve extends Line{
    /**
     * @method constructor BezierCurve
     * @param {Object} options 
     */
    constructor(options){
        super(dataUtil.merge({
            shape: {
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 0,
                cpx1: 0,
                cpy1: 0,
                percent: 1
            },
            style: {
                stroke: '#000',
                fill: null
            }
        },options,true));

        /**
         * @property {String} type
         */
        this.type='bezier-curve';
    }

    /**
     * @method buildPath
     * Build the path of current line, the data structure is like the path attribute in SVG.
     * 
     * 
     * 构建当前线条的路径，数据结构类似 SVG 中的 path 属性。
     * @param {Object} ctx 
     * @param {String} shape 
     */
    buildPath(ctx, shape) {
        let x1 = shape.x1;
        let y1 = shape.y1;
        let x2 = shape.x2;
        let y2 = shape.y2;
        let cpx1 = shape.cpx1;
        let cpy1 = shape.cpy1;
        let cpx2 = shape.cpx2;
        let cpy2 = shape.cpy2;
        let percent = shape.percent;
        if (percent === 0) {
            return;
        }

        ctx.moveTo(x1, y1);

        if (cpx2 == null || cpy2 == null) {
            if (percent < 1) {
                curveUtil.quadraticSubdivide(
                    x1, cpx1, x2, percent, out
                );
                cpx1 = out[1];
                x2 = out[2];
                curveUtil.quadraticSubdivide(
                    y1, cpy1, y2, percent, out
                );
                cpy1 = out[1];
                y2 = out[2];
            }

            ctx.quadraticCurveTo(
                cpx1, cpy1,
                x2, y2
            );
        }else {
            if (percent < 1) {
                curveUtil.cubicSubdivide(
                    x1, cpx1, cpx2, x2, percent, out
                );
                cpx1 = out[1];
                cpx2 = out[2];
                x2 = out[3];
                curveUtil.cubicSubdivide(
                    y1, cpy1, cpy2, y2, percent, out
                );
                cpy1 = out[1];
                cpy2 = out[2];
                y2 = out[3];
            }
            ctx.bezierCurveTo(
                cpx1, cpy1,
                cpx2, cpy2,
                x2, y2
            );
        }
    }

    /**
     * @method pointAt
     * Get point at percent.
     * 
     * 
     * 按照比例获取线条上的点。
     * @param  {Number} percent
     * @return {Array<Number>}
     */
    pointAt(t) {
        return someVectorAt(this.shape, t, false);
    }

    firstPoint(){
        return this.pointAt(0);
    }

    firstTwoPoints(){
        return [[...this.pointAt(0)],[...this.pointAt(0.2)]];
    }

    lastPoint(){
        return this.pointAt(1);
    }

    lastTwoPoints(){
        return [[...this.pointAt(1)],[...this.pointAt(0.8)]];
    }

    /**
     * Get tangent at percent
     * @param  {Number} t
     * @return {Array<Number>}
     */
    tangentAt(t) {
        let p = someVectorAt(this.shape, t, true);
        return vectorUtil.normalize(p, p);
    }
}