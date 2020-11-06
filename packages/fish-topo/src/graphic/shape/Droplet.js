import * as dataUtil from '../../utils/data_structure_util';
import Shape from './Shape';

/**
 * @class fishTopo.graphic.shape.Droplet 
 * 水滴形状
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
export default class Droplet extends Shape{
    /**
     * @method constructor Droplet
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
        this.type='droplet';
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

        ctx.moveTo(x, y + a);
        ctx.bezierCurveTo(
            x + a,
            y + a,
            x + a * 3 / 2,
            y - a / 3,
            x,
            y - b
        );
        ctx.bezierCurveTo(
            x - a * 3 / 2,
            y - a / 3,
            x - a,
            y + a,
            x,
            y + a
        );
        ctx.closePath();
    }
}