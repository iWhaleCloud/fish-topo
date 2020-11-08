import {PI2} from '../../utils/constants';
import * as dataUtil from '../../utils/data_structure_util';
import Shape from './Shape';

/**
 * @class fishTopo.graphic.shape.Ring 
 * 圆环
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
export default class Ring extends Shape{
    /**
     * @method constructor Ring
     * @param {Object} options 
     */
    constructor(options){
        super(dataUtil.merge({
            shape: {
                cx: 0,
                cy: 0,
                r: 0,
                r0: 0
            }
        },options,true));

        /**
         * @property {String} type
         */
        this.type='ring';
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
        ctx.moveTo(x + shape.r, y);
        ctx.arc(x, y, shape.r, 0, PI2, false);
        ctx.moveTo(x + shape.r0, y);
        ctx.arc(x, y, shape.r0, 0, PI2, true);
    }
}