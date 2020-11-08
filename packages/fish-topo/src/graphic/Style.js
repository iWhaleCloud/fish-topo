/* eslint-disable no-prototype-builtins */
import fixShadow from '../utils/fix_shadow';
import {ContextCachedBy} from '../utils/constants';
import {mathMin} from '../utils/constants';
import * as dataUtil from '../utils/data_structure_util';
import RadialGradient from '../graphic/gradient/RadialGradient';
import LinearGradient from '../graphic/gradient/LinearGradient';

/**
 * @class fishTopo.graphic.Style
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

let STYLE_COMMON_PROPS = [
    ['shadowBlur', 0], ['shadowOffsetX', 0], ['shadowOffsetY', 0], ['shadowColor', '#000'],
    ['lineCap', 'butt'], ['lineJoin', 'miter'], ['miterLimit', 10]
];

function createLinearGradient(ctx, obj, rect) {
    let x = obj.x == null ? 0 : obj.x;
    let x2 = obj.x2 == null ? 1 : obj.x2;
    let y = obj.y == null ? 0 : obj.y;
    let y2 = obj.y2 == null ? 0 : obj.y2;

    if (!obj.global) {
        x = x * rect.width + rect.x1;
        x2 = x2 * rect.width + rect.x1;
        y = y * rect.height + rect.y1;
        y2 = y2 * rect.height + rect.y1;
    }

    // Fix NaN when rect is Infinity
    x = isNaN(x) ? 0 : x;
    x2 = isNaN(x2) ? 1 : x2;
    y = isNaN(y) ? 0 : y;
    y2 = isNaN(y2) ? 0 : y2;

    let canvasGradient = ctx.createLinearGradient(x, y, x2, y2);

    return canvasGradient;
}

function createRadialGradient(ctx, obj, rect) {
    let width = rect.width;
    let height = rect.height;
    let min = mathMin(width, height);

    let x = obj.x == null ? 0.5 : obj.x;
    let y = obj.y == null ? 0.5 : obj.y;
    let r = obj.r == null ? 0.5 : obj.r;
    if (!obj.global) {
        x = x * width + rect.x1;
        y = y * height + rect.y1;
        r = r * min;
    }

    let canvasGradient = ctx.createRadialGradient(x, y, 0, x, y, r);

    return canvasGradient;
}

let Style = function (opts) {
    if(opts&&dataUtil.isObject(opts.fill)){
        if(opts.fill.type==='radial'){
            this.fill=new RadialGradient(opts.fill.x||0.5, opts.fill.y||0.5, opts.fill.r||0.5, opts.fill.colorStops||[], opts.fill.globalCoord||false);
        }else if(opts.fill.type==='linear'){
            this.fill=new LinearGradient(opts.fill.x||0, opts.fill.y||0, opts.fill.x1||1, opts.fill.y1||0, opts.fill.colorStops||[], opts.fill.globalCoord||false);
        }
    }
    this.extendStyle(opts, false);
};

Style.prototype = {
    constructor: Style,

    /**
     * @property {String} fill
     */
    fill: '#000',

    /**
     * @property {String} stroke
     */
    stroke: null,

    /**
     * @property {Number} opacity
     */
    opacity: 1,

    /**
     * @property {Number} fillOpacity
     */
    fillOpacity: null,

    /**
     * @property {Number} strokeOpacity
     */
    strokeOpacity: null,

    /**
     * @property {Array<Number>|Boolean} lineDash
     * `true` is not supported.
     * `false`/`null`/`undefined` are the same.
     * `false` is used to remove lineDash in some
     * case that `null`/`undefined` can not be set.
     * (e.g., emphasis.lineStyle in echarts)
     */
    lineDash: null,

    /**
     * @property {Number} lineDashOffset
     */
    lineDashOffset: 0,

    /**
     * @property {Number} shadowBlur
     */
    shadowBlur: 0,

    /**
     * @property {Number} shadowOffsetX
     */
    shadowOffsetX: 0,

    /**
     * @property {Number} shadowOffsetY
     */
    shadowOffsetY: 0,

    /**
     * @property {Number} lineWidth
     */
    lineWidth: 1,

    /**
     * @property {Boolean} strokeNoScale
     * If stroke ignore scale
     */
    strokeNoScale: false,

    // Bounding rect text configuration
    // Not affected by element transform
    /**
     * @property {String} text
     */
    text: null,

    /**
     * @property {String} font
     * If `fontSize` or `fontFamily` exists, `font` will be reset by
     * `fontSize`, `fontStyle`, `fontWeight`, `fontFamily`.
     * So do not visit it directly in upper application (like echarts),
     * but use `contain/text_util#makeFont` instead.
     */
    font: null,

    /**
     * @deprecated
     * @property {String} textFont
     * The same as font. Use font please.
     */
    textFont: null,

    /**
     * @property {String} fontStyle
     * It helps merging respectively, rather than parsing an entire font string.
     */
    fontStyle: null,

    /**
     * @property {String} fontWeight
     * It helps merging respectively, rather than parsing an entire font string.
     */
    fontWeight: null,

    /**
     * @property {Number} fontSize
     * It helps merging respectively, rather than parsing an entire font string.
     * Should be 12 but not '12px'.
     */
    fontSize: null,

    /**
     * @property {String} fontFamily
     * It helps merging respectively, rather than parsing an entire font string.
     */
    fontFamily: null,

    /**
     * @property {String} textTag
     * Reserved for special functinality, like 'hr'.
     */
    textTag: null,

    /**
     * @property {String} textFill
     */
    textFill: '#000',

    /**
     * @property {String} textStroke
     */
    textStroke: null,

    /**
     * @property {Number} textWidth
     */
    textWidth: null,

    /**
     * @property {Number} textHeight
     * Only for textBackground.
     */
    textHeight: null,

    /**
     * @property {Number} textStrokeWidth
     * textStroke may be set as some color as a default
     * value in upper applicaion, where the default value
     * of textStrokeWidth should be 0 to make sure that
     * user can choose to do not use text stroke.
     */
    textStrokeWidth: 0,

    /**
     * @property {Number} textLineHeight
     */
    textLineHeight: null,

    /**
     * @property {string|Array<Number>} textPosition
     * 'inside', 'left', 'right', 'top', 'bottom'
     * [x, y]
     * Based on x, y of rect.
     */
    textPosition: 'inside',

    /**
     * @property {Object} textRect
     * If not specified, use the boundingRect of a `displayable`.
     */
    textRect: null,

    /**
     * @property {Array<Number>} textOffset
     * [x, y]
     */
    textOffset: null,

    /**
     * @property {String} textAlign
     */
    textAlign: null,

    /**
     * @property {String} textVerticalAlign
     */
    textVerticalAlign: null,

    /**
     * @property {Number} textDistance
     */
    textDistance: 5,

    /**
     * @property {String} textShadowColor
     */
    textShadowColor: 'transparent',

    /**
     * @property {Number} textShadowBlur
     */
    textShadowBlur: 0,

    /**
     * @property {Number} textShadowOffsetX
     */
    textShadowOffsetX: 0,

    /**
     * @property {Number} textShadowOffsetY
     */
    textShadowOffsetY: 0,

    /**
     * @property {String} textBoxShadowColor
     */
    textBoxShadowColor: 'transparent',

    /**
     * @property {Number} textBoxShadowBlur
     */
    textBoxShadowBlur: 0,

    /**
     * @property {Number} textBoxShadowOffsetX
     */
    textBoxShadowOffsetX: 0,

    /**
     * @property {Number} textBoxShadowOffsetY
     */
    textBoxShadowOffsetY: 0,

    /**
     * @property {Boolean} transformText
     * Whether transform text.
     * Only available in Path and Image element,
     * where the text is called as `RectText`.
     */
    transformText: false,

    /**
     * @property {Number} textRotation
     * Text rotate around position of Path or Image.
     * The origin of the rotation can be specified by `textOrigin`.
     * Only available in Path and Image element,
     * where the text is called as `RectText`.
     */
    textRotation: 0,

    /**
     * @property {String|Array<Number>} textOrigin
     * Text origin of text rotation.
     * Useful in the case like label rotation of circular symbol.
     * Only available in Path and Image element, where the text is called
     * as `RectText` and the element is called as "host element".
     * The value can be:
     * + If specified as a coordinate like `[10, 40]`, it is the `[x, y]`
     * base on the left-top corner of the rect of its host element.
     * + If specified as a string `center`, it is the center of the rect of
     * its host element.
     * + By default, this origin is the `textPosition`.
     */
    textOrigin: null,

    /**
     * @property {String} textBackgroundColor
     */
    textBackgroundColor: null,

    /**
     * @property {String} textBorderColor
     */
    textBorderColor: null,

    /**
     * @property {Number} textBorderWidth
     */
    textBorderWidth: 0,

    /**
     * @property {Number} textBorderRadius
     */
    textBorderRadius: 0,

    /**
     * @property {number|Array<Number>} textPadding
     * Can be `2` or `[2, 4]` or `[2, 3, 4, 5]`
     */
    textPadding: null,

    /**
     * @property {Object} rich
     * Text styles for rich text.
     */
    rich: null,

    /**
     * @property {Object} truncate
     * {outerWidth, outerHeight, ellipsis, placeholder}
     */
    truncate: null,

    /**
     * @property {String} blend
     * https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
     */
    blend: null,

    /**
     * @method bind
     * @param {CanvasRenderingContext2D} ctx
     * @param {Element} el
     * @param {Element} prevEl
     */
    bind: function (ctx, el, prevEl) {
        let style = this;
        let prevStyle = prevEl && prevEl.style;
        // If no prevStyle, it means first draw.
        // Only apply cache if the last time cachced by this function.
        let notCheckCache = !prevStyle || ctx.__attrCachedBy !== ContextCachedBy.STYLE_BIND;

        ctx.__attrCachedBy = ContextCachedBy.STYLE_BIND;

        for (let i = 0; i < STYLE_COMMON_PROPS.length; i++) {
            let prop = STYLE_COMMON_PROPS[i];
            let styleName = prop[0];

            if (notCheckCache || style[styleName] !== prevStyle[styleName]) {
                // FIXME Invalid property value will cause style leak from previous element.
                ctx[styleName] =
                    fixShadow(ctx, styleName, style[styleName] || prop[1]);
            }
        }

        if ((notCheckCache || style.fill !== prevStyle.fill)) {
            ctx.fillStyle = style.fill;
        }
        if ((notCheckCache || style.stroke !== prevStyle.stroke)) {
            ctx.strokeStyle = style.stroke;
        }
        if ((notCheckCache || style.opacity !== prevStyle.opacity)) {
            ctx.globalAlpha = style.opacity == null ? 1 : style.opacity;
        }

        if ((notCheckCache || style.blend !== prevStyle.blend)) {
            ctx.globalCompositeOperation = style.blend || 'source-over';
        }
        if (this.hasStroke()) {
            let lineWidth = style.lineWidth;
            ctx.lineWidth = lineWidth / (
                (this.strokeNoScale && el && el.getLineScale) ? el.getLineScale() : 1
            );
        }
    },

    /**
     * @method hasFill
     */
    hasFill: function () {
        let fill = this.fill;
        return fill != null && fill !== 'none';
    },

    /**
     * @method hasStroke
     */
    hasStroke: function () {
        let stroke = this.stroke;
        return stroke != null && stroke !== 'none' && this.lineWidth > 0;
    },

    /**
     * @method extendStyle
     * Extend from other style
     * @param {Style} otherStyle
     * @param {Boolean} overwrite true: overwrirte any way.
     *                            false: overwrite only when !target.hasOwnProperty
     *                            others: overwrite when property is not null/undefined.
     */
    extendStyle: function (otherStyle, overwrite) {
        if (otherStyle) {
            for (let name in otherStyle) {
                if (otherStyle.hasOwnProperty(name)
                    && (overwrite === true
                        || (
                            overwrite === false
                                ? !this.hasOwnProperty(name)
                                : otherStyle[name] != null
                        )
                    )
                ) {
                    this[name] = otherStyle[name];
                }
            }
        }
    },

    /**
     * @method set
     * Batch setting style with a given object
     * @param {Object|String} obj
     * @param {*} [obj]
     */
    set: function (obj, value) {
        if (typeof obj === 'string') {
            this[obj] = value;
        }
        else {
            this.extendStyle(obj, true);
        }
    },

    /**
     * @method clone
     * @return {Style}
     */
    clone: function () {
        let newStyle = new this.constructor();
        newStyle.extendStyle(this, true);
        return newStyle;
    },

    /**
     * @method getGradient
     * @param {*} ctx 
     * @param {*} obj 
     * @param {*} rect 
     */
    getGradient: function (ctx, obj, rect) {
        let method = obj.type === 'radial' ? createRadialGradient : createLinearGradient;
        let canvasGradient = method(ctx, obj, rect);
        let colorStops = obj.colorStops;
        for (let i = 0; i < colorStops.length; i++) {
            canvasGradient.addColorStop(
                colorStops[i].offset, colorStops[i].color
            );
        }
        return canvasGradient;
    }
};

let styleProto = Style.prototype;
for (let i = 0; i < STYLE_COMMON_PROPS.length; i++) {
    let prop = STYLE_COMMON_PROPS[i];
    if (!(prop[0] in styleProto)) {
        styleProto[prop[0]] = prop[1];
    }
}

// Provide for others
Style.getGradient = styleProto.getGradient;

export default Style;