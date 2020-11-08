/**
 * @class fishTopo.graphic.Pattern
 * 
 * Pattern
 * 
 * 图案
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
class Pattern{
    /**
     * @method  constructor Pattern
     * @param {*} image 
     * @param {*} repeat 
     */
    constructor(image, repeat){
        // Should do nothing more in this constructor. Because gradient can be
        // declard by `color: {image: ...}`, where this constructor will not be called.
        this.image = image;
        this.repeat = repeat;
        this.type = 'pattern';
        /**
         * @property {String} type
         */
        this.type='pattern';
    }

    getCanvasPattern(ctx) {
        return ctx.createPattern(this.image, this.repeat || 'repeat');
    }
}

export default Pattern;