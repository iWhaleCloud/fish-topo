import * as classUtil from '../../utils/class_util';
import Gradient from './Gradient';
/**
 * @class fishTopo.graphic.gradient.RadialGradient 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

/**
 * @method constructor RadialGradient
 * @param {Number} [x=0.5]
 * @param {Number} [y=0.5]
 * @param {Number} [r=0.5]
 * @param {Array<Object>} [colorStops]
 * @param {Boolean} [globalCoord=false]
 */
let RadialGradient = function (x, y, r, colorStops, globalCoord) {
    // Should do nothing more in this constructor. Because gradient can be
    // declard by `color: {type: 'radial', colorStops: ...}`, where
    // this constructor will not be called.
    this.x = x == null ? 0.5 : x;
    this.y = y == null ? 0.5 : y;
    this.r = r == null ? 0.5 : r;
    // Can be cloned
    this.type = 'radial';
    // If use global coord
    this.global = globalCoord || false;
    Gradient.call(this, colorStops);
};

RadialGradient.prototype = {
    constructor: RadialGradient
};

classUtil.inherits(RadialGradient, Gradient);

export default RadialGradient;