import * as textUtil from '../utils/text_util';
import BoundingRect from './BoundingRect';
import {WILL_BE_RESTORED} from '../utils/constants';
/**
 * @class fishTopo.graphic.RectText 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

let tmpRect = new BoundingRect();
let RectText = function () {};

/**
 * @method constructor RectText
 */
RectText.prototype = {
    constructor: RectText,
    
    /**
     * Draw text in a rect with specified position.
     * @param  {CanvasRenderingContext2D} ctx
     * @param  {Object} rect Displayable rect
     */
    drawRectText: function (ctx, rect) {
        let style = this.style;
        rect = style.textRect || rect;
        // Optimize, avoid normalize every time.
        this.__dirty && textUtil.normalizeTextStyle(style, true);
        let text = style.text;
        // Convert to string
        text != null && (text += '');
        if (!textUtil.needDrawText(text, style)) {
            return;
        }
        // FIXME
        // Do not provide prevEl to `textUtil.renderText` for ctx prop cache,
        // but use `ctx.save()` and `ctx.restore()`. Because the cache for rect
        // text propably break the cache for its host elements.
        ctx.save();

        // Transform rect to view space
        let transform = this.transform;
        if (!style.transformText) {
            if (transform) {
                tmpRect.copy(rect);
                tmpRect.applyTransform(transform);
                rect = tmpRect;
            }
        }else {
            this.applyTransform(ctx);
        }
        // transformText and textRotation can not be used at the same time.
        textUtil.renderText(this, ctx, text, style, rect, WILL_BE_RESTORED);
        ctx.restore();
    }
};

export default RectText;