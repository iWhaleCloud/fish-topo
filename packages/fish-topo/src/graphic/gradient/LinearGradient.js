import * as classUtil from '../../utils/class_util';
import Gradient from './Gradient';

/**
 * @class fishTopo.graphic.gradient.LinearGradient 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

/**
 * @method constructor LinearGradient
 * @param {Number} [x=0]
 * @param {Number} [y=0]
 * @param {Number} [x2=1]
 * @param {Number} [y2=0]
 * @param {Array<Object>} colorStops
 * @param {Boolean} [globalCoord=false]
 */
var LinearGradient = function (x, y, x2, y2, colorStops, globalCoord) {
    // Should do nothing more in this constructor. Because gradient can be
    // declard by `color: {type: 'linear', colorStops: ...}`, where
    // this constructor will not be called.
    this.x = x == null ? 0 : x;
    this.y = y == null ? 0 : y;
    this.x2 = x2 == null ? 1 : x2;
    this.y2 = y2 == null ? 0 : y2;
    // Can be cloned
    this.type = 'linear';
    // If use global coord
    this.global = globalCoord || false;
    Gradient.call(this, colorStops);
};

LinearGradient.prototype = {
    constructor: LinearGradient
};

classUtil.inherits(LinearGradient, Gradient);

export default LinearGradient;