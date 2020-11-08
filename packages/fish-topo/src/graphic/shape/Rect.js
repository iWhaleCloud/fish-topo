import * as roundRectHelper from '../../utils/round_rect';
import * as dataUtil from '../../utils/data_structure_util';
import {subPixelOptimizeRect} from '../../utils/sub_pixel_optimize';
import Shape from './Shape';

/**
 * @class fishTopo.graphic.shape.Rect 
 * 矩形
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
// Avoid create repeatly.
let subPixelOptimizeOutputShape = {};
export default class Rect extends Shape{
    /**
     * @method constructor Rect
     * @param {Object} options 
     */
    constructor(options){
        super(dataUtil.merge({
            shape: {
                // 左上、右上、右下、左下角的半径依次为r1、r2、r3、r4
                // r缩写为1         相当于 [1, 1, 1, 1]
                // r缩写为[1]       相当于 [1, 1, 1, 1]
                // r缩写为[1, 2]    相当于 [1, 2, 1, 2]
                // r缩写为[1, 2, 3] 相当于 [1, 2, 3, 2]
                r: 0,
                x: 0,
                y: 0,
                width: 0,
                height: 0
            }
        },options,true));

        /**
         * @property {String} type
         */
        this.type='rect';
    }

    /**
     * @method buildPath
     * 绘制元素路径
     * @param {Object} ctx 
     * @param {String} shape 
     */
    buildPath(ctx, shape) {
        let x;
        let y;
        let width;
        let height;

        if (this.subPixelOptimize) {
            subPixelOptimizeRect(subPixelOptimizeOutputShape, shape, this.style);
            x = subPixelOptimizeOutputShape.x;
            y = subPixelOptimizeOutputShape.y;
            width = subPixelOptimizeOutputShape.width;
            height = subPixelOptimizeOutputShape.height;
            subPixelOptimizeOutputShape.r = shape.r;
            shape = subPixelOptimizeOutputShape;
        }else {
            x = shape.x;
            y = shape.y;
            width = shape.width;
            height = shape.height;
        }

        if (!shape.r) {
            ctx.rect(x, y, width, height);
        }else {
            roundRectHelper.buildPath(ctx, shape);
        }
        
        ctx.closePath();
        return;
    }
}