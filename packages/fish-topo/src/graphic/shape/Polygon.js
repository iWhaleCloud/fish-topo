import * as polyHelper from '../../utils/poly_util';
import * as dataUtil from '../../utils/data_structure_util';
import Shape from './Shape';

/**
 * @class fishTopo.graphic.shape.Polygon 
 * 多边形
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
export default class Polygon extends Shape{
    /**
     * @method constructor Polygon
     * @param {Object} options 
     */
    constructor(options){
        super(dataUtil.merge({
            shape: {
                points: null,
                smooth: false,
                smoothConstraint: null
            }
        },options,true));

        /**
         * @property {String} type
         */
        this.type='polygon';
    }

    /**
     * @method buildPath
     * 绘制元素路径
     * @param {Object} ctx 
     * @param {String} shape 
     */
    buildPath(ctx, shape) {
        polyHelper.buildPath(ctx, shape, true);
    }
}