/**
 * @class fishTopo.graphic.gradient.Gradient 
 * 渐变
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
/**
 * @method constructor Gradient
 * @param {Array<Object>} colorStops
 */
var Gradient = function (colorStops) {
    this.colorStops = colorStops || [];
};

Gradient.prototype = {
    constructor: Gradient,
    addColorStop: function (offset, color) {
        this.colorStops.push({
            offset: offset,
            color: color
        });
    }
};

export default Gradient;