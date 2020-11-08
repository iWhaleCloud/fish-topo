import * as dataUtil from '../../utils/data_structure_util';
import Shape from './Shape';

/**
 * @class fishTopo.graphic.shape.Heart 
 * 心形
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
export default class Heart extends Shape{
    /**
     * @method constructor Heart
     * @param {Object} options 
     */
    constructor(options){
        super(dataUtil.merge({
            shape: {
                cx: 0,
                cy: 0,
                width: 0,
                height: 0
            }
        },options,true));

        /**
         * @property {String} type
         */
        this.type='heart';
    }

    /**
     * @method buildPath
     * 绘制元素路径
     * @param {Object} ctx 
     * @param {String} shape 
     */
    buildPath(ctx, shape) {
        let x = shape.cx;
        let y = shape.cy;
        let a = shape.width;
        let b = shape.height;
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(
            x + a / 2, y - b * 2 / 3,
            x + a * 2, y + b / 3,
            x, y + b
        );
        ctx.bezierCurveTo(
            x - a * 2, y + b / 3,
            x - a / 2, y - b * 2 / 3,
            x, y
        );
    }
}