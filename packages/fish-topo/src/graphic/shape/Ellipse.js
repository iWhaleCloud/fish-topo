import * as dataUtil from '../../utils/data_structure_util';
import Shape from './Shape';

/**
 * @class fishTopo.graphic.shape.Ellipse 
 * 椭圆形状
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
                rx: 0, 
                ry: 0
            }
        },options,true));
        /**
         * @property {String} type
         */
        this.type='ellipse';
    }

    /**
     * @method buildPath
     * 绘制元素路径
     * @param {Object} ctx 
     * @param {String} shape 
     */
    buildPath(ctx, shape) {
        let k = 0.5522848;
        let x = shape.cx;
        let y = shape.cy;
        let a = shape.rx;
        let b = shape.ry;
        let ox = a * k; // 水平控制点偏移量
        let oy = b * k; // 垂直控制点偏移量
        // 从椭圆的左端点开始顺时针绘制四条三次贝塞尔曲线
        ctx.moveTo(x - a, y);
        ctx.bezierCurveTo(x - a, y - oy, x - ox, y - b, x, y - b);
        ctx.bezierCurveTo(x + ox, y - b, x + a, y - oy, x + a, y);
        ctx.bezierCurveTo(x + a, y + oy, x + ox, y + b, x, y + b);
        ctx.bezierCurveTo(x - ox, y + b, x - a, y + oy, x - a, y);
        ctx.closePath();
    }
}