import * as dataUtil from '../../utils/data_structure_util';
import {mathSin,mathCos,PI} from '../../utils/constants';
import Shape from './Shape';

/**
 * @class fishTopo.graphic.shape.Star 
 * n角星（n>3）
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
export default class Star extends Shape{
    /**
     * @method constructor Star
     * @param {Object} options 
     */
    constructor(options){
        super(dataUtil.merge({
            shape: {
                cx: 0,
                cy: 0,
                n: 3,
                r0: null,
                r: 0
            }
        },options,true));

        /**
         * @property {String} type
         */
        this.type='star';
    }

    /**
     * @method buildPath
     * 绘制元素路径
     * @param {Object} ctx 
     * @param {String} shape 
     */
    buildPath(ctx, shape) {
        let n = shape.n;
        if (!n || n < 2) {
            return;
        }

        let x = shape.cx;
        let y = shape.cy;
        let r = shape.r;
        let r0 = shape.r0;

        // 如果未指定内部顶点外接圆半径，则自动计算
        if (r0 == null) {
            r0 = n > 4
                // 相隔的外部顶点的连线的交点，
                // 被取为内部交点，以此计算r0
                ? r * mathCos(2 * PI / n) / mathCos(PI / n)
                // 二三四角星的特殊处理
                : r / 3;
        }

        let dStep = PI / n;
        let deg = -PI / 2;
        let xStart = x + r * mathCos(deg);
        let yStart = y + r * mathSin(deg);
        deg += dStep;

        // 记录边界点，用于判断inside
        ctx.moveTo(xStart, yStart);
        for (let i = 0, end = n * 2 - 1, ri; i < end; i++) {
            ri = i % 2 === 0 ? r0 : r;
            ctx.lineTo(x + ri * mathCos(deg), y + ri * mathSin(deg));
            deg += dStep;
        }

        ctx.closePath();
    }
}