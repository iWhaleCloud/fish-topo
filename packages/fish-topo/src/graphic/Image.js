import * as imageHelper from '../utils/image_util';
import * as classUtil from '../utils/class_util';
import Element from './Element';
import BoundingRect from './BoundingRect';
import Linkable from './link/Linkable';

/**
 * @class fishTopo.graphic.QImage 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
class QImage extends Element{
    /**
     * @method constructor QImage
     * @param {Object} options
     */
    constructor(options){
        super(options);
        /**
         * @property {String}
         */
        this.type='image';

        classUtil.inheritProperties(this,Linkable,this.options);
        classUtil.copyOwnProperties(this,this.options,['style','shape']);
    }

    /**
     * @method render
     */
    render() {
        let ctx=this.ctx;
        let prevEl=this.prevEl;

        let style = this.style;
        let src = style.image;

        // Must bind each time
        style.bind(ctx, this, prevEl);

        let image = this._image = imageHelper.createOrUpdateImage(
            src,
            this._image,
            this,
            this.onload
        );

        if (!image || !imageHelper.isImageReady(image)) {
            return;
        }

        let x = style.x || 0;
        let y = style.y || 0;
        let width = style.width;
        let height = style.height;
        let aspect = image.width / image.height;
        if (width == null && height != null) {
            // Keep image/height ratio
            width = height * aspect;
        }else if (height == null && width != null) {
            height = width / aspect;
        }else if ((!width) && (!height)) {
            width = image.width;
            height = image.height;
        }

        this.applyTransform(ctx);

        if (style.sWidth && style.sHeight) {
            let sx = style.sx || 0;
            let sy = style.sy || 0;
            ctx.drawImage(
                image,
                sx, sy, style.sWidth, style.sHeight,
                x, y, width, height
            );
        }else if (style.sx && style.sy) {
            let sx = style.sx;
            let sy = style.sy;
            let sWidth = width - sx;
            let sHeight = height - sy;
            ctx.drawImage(
                image,
                sx, 
                sy, 
                sWidth, 
                sHeight,
                x, 
                y, 
                width, 
                height
            );
        }else {
            ctx.drawImage(image, x, y, width, height);
        }

        Element.prototype.render.call(this,ctx,prevEl);
    }

    /**
     * @method getBoundingRect
     */
    getBoundingRect() {
        let style = this.style;
        if(!style.x){
            style.x=0;
        }
        if(!style.y){
            style.y=0;
        }
        if(!style.width){
            style.width=0;
        }
        if(!style.height){
            style.height=0;
        }

        if (!this.__boundingRect) {
            this.__boundingRect = new BoundingRect(
                style.x, 
                style.y,
                style.width-style.x,
                style.height-style.y, 
                style.width, 
                style.height
            );
        }
        return this.__boundingRect;
    }

    toJSONObject(){
        let result=Element.prototype.toJSONObject.call(this);
        result.linkable=this.linkable;
        return result;
    }
}

classUtil.mixin(QImage, Linkable);
export default QImage;