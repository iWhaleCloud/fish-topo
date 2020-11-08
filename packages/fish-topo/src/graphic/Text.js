import Element from './Element';
import * as textUtil from '../utils/text_util';
import {ContextCachedBy} from '../utils/constants';

/**
 * @class fishTopo.graphic.Text
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
export default class Text extends Element{
    /**
     * @method constructor Text
     * @param {Object} opts 
     */
    constructor(opts){
        super(opts);
        /**
         * @property {String} type
         */
        this.type='text';
    }

    /**
     * @method render
     */
    render() {
        let ctx = this.ctx;
        let prevEl=this.prevEl;
        let style = this.style;

        // Optimize, avoid normalize every time.
        this.__dirty && textUtil.normalizeTextStyle(style, true);

        // Use props with prefix 'text'.
        style.fill = null;
        style.stroke = null;
        style.shadowBlur = null;
        style.shadowColor = null;
        style.shadowOffsetX = null;
        style.shadowOffsetY = null;

        let text = style.text;
        // Convert to string
        text != null && (text += '');

        // Do not apply style.bind in Text node. Because the real bind job
        // is in textUtil.renderText, and performance of text render should
        // be considered.
        // style.bind(ctx, this, prevEl);

        if (!textUtil.needDrawText(text, style)) {
            // The current el.style is not applied
            // and should not be used as cache.
            ctx.__attrCachedBy = ContextCachedBy.NONE;
            return;
        }

        this.applyTransform(ctx);
        textUtil.renderText(this, ctx, text, style, null, prevEl);
        this.restoreTransform(ctx);
    }

    /**
     * @method getBoundingRect
     * Get bounding rect of this element, NOTE: 
     * this method will return the bounding rect without transforming(translate/scale/rotate/skew). 
     * However, direct modifications to the shape property will be reflected in the bouding-rect.
     * For example,  if we modify this.shape.width directly, then the new width property will be calculated.
     * 
     * 
     * 获取当前元素的边界矩形，注意：
     * 此方法返回的是没有经过 transform(translate/scale/rotate/skew) 处理的边界矩形，但是对 shape 属性直接进行的修改会反映在获取的边界矩形上。
     * 例如，用代码直接对 this.shape.width 进行赋值，那么在计算边界矩形时就会用新的 width 属性进行计算。
     */
    getBoundingRect() {
        let style = this.style;
        // Optimize, avoid normalize every time.
        this.__dirty && textUtil.normalizeTextStyle(style, true);
        if (!this.__boundingRect) {
            let text = style.text;
            text != null ? (text += '') : (text = '');
            let rect = textUtil.getBoundingRect(
                style.text + '',
                style.font,
                style.textAlign,
                style.textVerticalAlign,
                style.textPadding,
                style.textLineHeight,
                style.rich
            );
            rect.x1 += style.x || 0;
            rect.y1 += style.y || 0;
            if (textUtil.getStroke(style.textStroke, style.textStrokeWidth)) {
                let w = style.textStrokeWidth;
                rect.x1 -= w / 2;
                rect.y1 -= w / 2;
                rect.width += w;
                rect.height += w;
                rect.x2 = rect.x1 + rect.width;
                rect.y2 = rect.y1 + rect.height;
            }
            this.__boundingRect = rect;
        }
        return this.__boundingRect;
    }
}