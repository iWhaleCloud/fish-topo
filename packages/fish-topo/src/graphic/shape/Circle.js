import * as dataUtil from '../../utils/data_structure_util';
import {PI2} from '../../utils/constants';
import Shape from './Shape';

/**
 * @class fishTopo.graphic.shape.Circle 
 * 圆形
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
export default class Circle extends Shape{
    /**
     * @method constructor Rect
     * @param {Object} options 
     */
    constructor(options){
        super(dataUtil.merge({
            shape: {
                cx: 0,
                cy: 0,
                r: 0
            }
        },options,true));
        
        /**
         * @property {String} type
         */
        this.type='circle';
    }

    /**
     * @method buildPath
     * 绘制元素路径
     * @param {Object} ctx 
     * @param {String} shape 
     */
    buildPath(ctx, shape, inBundle) {
        // Better stroking in ShapeBundle
        // Always do it may have performence issue ( fill may be 2x more cost)
        if (inBundle) {
            ctx.moveTo(shape.cx + shape.r, shape.cy);
        }
        ctx.arc(shape.cx, shape.cy, shape.r, 0, PI2, true);
    }
}