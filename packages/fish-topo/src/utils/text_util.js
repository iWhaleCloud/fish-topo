import * as dataUtil from './data_structure_util';
import * as roundRectHelper from './round_rect';
import * as imageHelper from './image_util';
import fixShadow from './fix_shadow';
import {ContextCachedBy, WILL_BE_RESTORED} from './constants';
import {extend,retrieve2,retrieve3,trim} from './data_structure_util';
import { getContext } from './canvas_util';
import { mathMax, mathFloor } from './constants';
import BoundingRect from '../graphic/BoundingRect';

export const DEFAULT_FONT = '12px sans-serif';
export const VALID_TEXT_ALIGN = {left: 1, right: 1, center: 1};// FIXME: support 'start', 'end'.
export const VALID_TEXT_VERTICAL_ALIGN = {top: 1, bottom: 1, middle: 1};
// Different from `STYLE_COMMON_PROPS` of `graphic/Style`,
// the default value of shadowColor is `'transparent'`.
export const SHADOW_STYLE_COMMON_PROPS = [
    ['textShadowBlur', 'shadowBlur', 0],
    ['textShadowOffsetX', 'shadowOffsetX', 0],
    ['textShadowOffsetY', 'shadowOffsetY', 0],
    ['textShadowColor', 'shadowColor', 'transparent']
];

let _tmpTextPositionResult = {};
let _tmpBoxPositionResult = {};
let textWidthCache = {};
let textWidthCacheCounter = 0;
let TEXT_CACHE_MAX = 5000;
let STYLE_REG = /\{([a-zA-Z0-9_]+)\|([^}]*)\}/g;
// Avoid assign to an exported variable, for transforming to cjs.
let methods = {};

export function $override(name, fn) {
    methods[name] = fn;
}

/**
 * @param {Style} style
 * @return {Style} The input style.
 */
export function normalizeTextStyle(style) {
    normalizeStyle(style);
    dataUtil.each(style.rich, normalizeStyle);
    return style;
}

function normalizeStyle(style) {
    if (style) {
        style.font = makeFont(style);
        let textAlign = style.textAlign;
        textAlign === 'middle' && (textAlign = 'center');
        style.textAlign = (
            textAlign == null || VALID_TEXT_ALIGN[textAlign]
        ) ? textAlign : 'left';

        // Compatible with textBaseline.
        let textVerticalAlign = style.textVerticalAlign || style.textBaseline;
        textVerticalAlign === 'center' && (textVerticalAlign = 'middle');
        style.textVerticalAlign = (
            textVerticalAlign == null || VALID_TEXT_VERTICAL_ALIGN[textVerticalAlign]
        ) ? textVerticalAlign : 'top';

        let textPadding = style.textPadding;
        if (textPadding) {
            style.textPadding = dataUtil.normalizeCssArray(style.textPadding);
        }
    }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {String} text
 * @param {Style} style
 * @param {Object|boolean} [rect] {x, y, width, height}
 *                  If set false, rect text is not used.
 * @param {Element|helper/constant.WILL_BE_RESTORED} [prevEl] For ctx prop cache.
 */
export function renderText(hostEl, ctx, text, style, rect, prevEl) {
    style.rich
        ? renderRichText(hostEl, ctx, text, style, rect, prevEl)
        : renderPlainText(hostEl, ctx, text, style, rect, prevEl);
}

// Avoid setting to ctx according to prevEl if possible for
// performance in scenarios of large amount text.
function renderPlainText(hostEl, ctx, text, style, rect, prevEl) {
    let needDrawBg = needDrawBackground(style);
    let prevStyle;
    let checkCache = false;
    let cachedByMe = ctx.__attrCachedBy === ContextCachedBy.PLAIN_TEXT;

    // Only take and check cache for `Text` el, but not RectText.
    if (prevEl !== WILL_BE_RESTORED) {
        if (prevEl) {
            prevStyle = prevEl.style;
            checkCache = !needDrawBg && cachedByMe && prevStyle;
        }
        // Prevent from using cache in `Style::bind`, because of the case:
        // ctx property is modified by other properties than `Style::bind`
        // used, and Style::bind is called next.
        ctx.__attrCachedBy = needDrawBg ? ContextCachedBy.NONE : ContextCachedBy.PLAIN_TEXT;
    }
    // Since this will be restored, prevent from using these props to check cache in the next
    // entering of this method. But do not need to clear other cache like `Style::bind`.
    else if (cachedByMe) {
        ctx.__attrCachedBy = ContextCachedBy.NONE;
    }

    let styleFont = style.font || DEFAULT_FONT;
    // PENDING
    // Only `Text` el set `font` and keep it (`RectText` will restore). So theoretically
    // we can make font cache on ctx, which can cache for text el that are discontinuous.
    // But layer save/restore needed to be considered.
    // if (styleFont !== ctx.__fontCache) {
    //     ctx.font = styleFont;
    //     if (prevEl !== WILL_BE_RESTORED) {
    //         ctx.__fontCache = styleFont;
    //     }
    // }
    if (!checkCache || styleFont !== (prevStyle.font || DEFAULT_FONT)) {
        ctx.font = styleFont;
    }

    // Use the final font from context-2d, because the final
    // font might not be the style.font when it is illegal.
    // But get `ctx.font` might be time consuming.
    let computedFont = hostEl.__computedFont;
    if (hostEl.__styleFont !== styleFont) {
        hostEl.__styleFont = styleFont;
        computedFont = hostEl.__computedFont = ctx.font;
    }

    let textPadding = style.textPadding;
    let textLineHeight = style.textLineHeight;

    let contentBlock = hostEl.__textCotentBlock;
    if (!contentBlock || hostEl.__dirtyText) {
        contentBlock = hostEl.__textCotentBlock = parsePlainText(
            text, computedFont, textPadding, textLineHeight, style.truncate
        );
    }

    let outerHeight = contentBlock.outerHeight;
    let textLines = contentBlock.lines;
    let lineHeight = contentBlock.lineHeight;
    let boxPos = getBoxPosition(_tmpBoxPositionResult, hostEl, style, rect);
    let baseX = boxPos.baseX;
    let baseY = boxPos.baseY;
    let textAlign = boxPos.textAlign || 'left';
    let textVerticalAlign = boxPos.textVerticalAlign;

    // Origin of textRotation should be the base point of text drawing.
    applyTextRotation(ctx, style, rect, baseX, baseY);

    let boxY = adjustTextY(baseY, outerHeight, textVerticalAlign);
    let textX = baseX;
    let textY = boxY;

    if (needDrawBg || textPadding) {
        // Consider performance, do not call getTextWidth util necessary.
        let textWidth = getWidth(text, computedFont);
        let outerWidth = textWidth;
        textPadding && (outerWidth += textPadding[1] + textPadding[3]);
        let boxX = adjustTextX(baseX, outerWidth, textAlign);

        needDrawBg && drawBackground(hostEl, ctx, style, boxX, boxY, outerWidth, outerHeight);

        if (textPadding) {
            textX = getTextXForPadding(baseX, textAlign, textPadding);
            textY += textPadding[0];
        }
    }

    // Always set textAlign and textBase line, because it is difficute to calculate
    // textAlign from prevEl, and we dont sure whether textAlign will be reset if
    // font set happened.
    ctx.textAlign = textAlign;
    // Force baseline to be "middle". Otherwise, if using "top", the
    // text will offset downward a little bit in font "Microsoft YaHei".
    ctx.textBaseline = 'middle';
    // Set text opacity
    ctx.globalAlpha = style.opacity || 1;
    let i = 0;

    // Always set shadowBlur and shadowOffset to avoid leak from displayable.
    for (i = 0; i < SHADOW_STYLE_COMMON_PROPS.length; i++) {
        let propItem = SHADOW_STYLE_COMMON_PROPS[i];
        let styleProp = propItem[0];
        let ctxProp = propItem[1];
        let val = style[styleProp];
        if (!checkCache || val !== prevStyle[styleProp]) {
            ctx[ctxProp] = fixShadow(ctx, ctxProp, val || propItem[2]);
        }
    }

    // `textBaseline` is set as 'middle'.
    textY += lineHeight / 2;

    let textStrokeWidth = style.textStrokeWidth;
    let textStrokeWidthPrev = checkCache ? prevStyle.textStrokeWidth : null;
    let strokeWidthChanged = !checkCache || textStrokeWidth !== textStrokeWidthPrev;
    let strokeChanged = !checkCache || strokeWidthChanged || style.textStroke !== prevStyle.textStroke;
    let textStroke = getStroke(style.textStroke, textStrokeWidth);
    let textFill = getFill(style.textFill);
    
    if (textStroke) {
        if (strokeWidthChanged) {
            ctx.lineWidth = textStrokeWidth;
        }
        if (strokeChanged) {
            ctx.strokeStyle = textStroke;
        }
    }
    if (textFill) {
        if (!checkCache || style.textFill !== prevStyle.textFill) {
            ctx.fillStyle = textFill;
        }
    }

    // Optimize simply, in most cases only one line exists.
    if (textLines.length === 1) {
        // Fill after stroke so the outline will not cover the main part.
        textStroke && ctx.strokeText(textLines[0], textX, textY);
        textFill && ctx.fillText(textLines[0], textX, textY);
    }
    else {
        for (i = 0; i < textLines.length; i++) {
            // Fill after stroke so the outline will not cover the main part.
            textStroke && ctx.strokeText(textLines[i], textX, textY);
            textFill && ctx.fillText(textLines[i], textX, textY);
            textY += lineHeight;
        }
    }
}

function renderRichText(hostEl, ctx, text, style, rect, prevEl) {
    // Do not do cache for rich text because of the complexity.
    // But `RectText` this will be restored, do not need to clear other cache like `Style::bind`.
    if (prevEl !== WILL_BE_RESTORED) {
        ctx.__attrCachedBy = ContextCachedBy.NONE;
    }

    let contentBlock = hostEl.__textCotentBlock;

    if (!contentBlock || hostEl.__dirtyText) {
        contentBlock = hostEl.__textCotentBlock = parseRichText(text, style);
    }

    drawRichText(hostEl, ctx, contentBlock, style, rect);
}

function drawRichText(hostEl, ctx, contentBlock, style, rect) {
    let contentWidth = contentBlock.width;
    let outerWidth = contentBlock.outerWidth;
    let outerHeight = contentBlock.outerHeight;
    let textPadding = style.textPadding;
    let boxPos = getBoxPosition(_tmpBoxPositionResult, hostEl, style, rect);
    let baseX = boxPos.baseX;
    let baseY = boxPos.baseY;
    let textAlign = boxPos.textAlign;
    let textVerticalAlign = boxPos.textVerticalAlign;

    // Origin of textRotation should be the base point of text drawing.
    applyTextRotation(ctx, style, rect, baseX, baseY);

    let boxX = adjustTextX(baseX, outerWidth, textAlign);
    let boxY = adjustTextY(baseY, outerHeight, textVerticalAlign);
    let xLeft = boxX;
    let lineTop = boxY;
    if (textPadding) {
        xLeft += textPadding[3];
        lineTop += textPadding[0];
    }
    let xRight = xLeft + contentWidth;

    needDrawBackground(style) && drawBackground(
        hostEl, ctx, style, boxX, boxY, outerWidth, outerHeight
    );

    for (let i = 0; i < contentBlock.lines.length; i++) {
        let line = contentBlock.lines[i];
        let tokens = line.tokens;
        let tokenCount = tokens.length;
        let lineHeight = line.lineHeight;
        let usedWidth = line.width;

        let leftIndex = 0;
        let lineXLeft = xLeft;
        let lineXRight = xRight;
        let rightIndex = tokenCount - 1;
        let token;

        while (
            leftIndex < tokenCount
            && (token = tokens[leftIndex], !token.textAlign || token.textAlign === 'left')
        ) {
            placeToken(hostEl, ctx, token, style, lineHeight, lineTop, lineXLeft, 'left');
            usedWidth -= token.width;
            lineXLeft += token.width;
            leftIndex++;
        }

        while (
            rightIndex >= 0
            && (token = tokens[rightIndex], token.textAlign === 'right')
        ) {
            placeToken(hostEl, ctx, token, style, lineHeight, lineTop, lineXRight, 'right');
            usedWidth -= token.width;
            lineXRight -= token.width;
            rightIndex--;
        }

        // The other tokens are placed as textAlign 'center' if there is enough space.
        lineXLeft += (contentWidth - (lineXLeft - xLeft) - (xRight - lineXRight) - usedWidth) / 2;
        while (leftIndex <= rightIndex) {
            token = tokens[leftIndex];
            // Consider width specified by user, use 'center' rather than 'left'.
            placeToken(hostEl, ctx, token, style, lineHeight, lineTop, lineXLeft + token.width / 2, 'center');
            lineXLeft += token.width;
            leftIndex++;
        }

        lineTop += lineHeight;
    }
}

function applyTextRotation(ctx, style, rect, x, y) {
    // textRotation only apply in RectText.
    if (rect && style.textRotation) {
        let origin = style.textOrigin;
        if (origin === 'center') {
            x = rect.width / 2 + rect.x1;
            y = rect.height / 2 + rect.y1;
        }
        else if (origin) {
            x = origin[0] + rect.x1;
            y = origin[1] + rect.y1;
        }

        ctx.translate(x, y);
        // Positive: anticlockwise
        ctx.rotate(-style.textRotation);
        ctx.translate(-x, -y);
    }
}

function placeToken(hostEl, ctx, token, style, lineHeight, lineTop, x, textAlign) {
    let tokenStyle = style.rich[token.styleName] || {};
    tokenStyle.text = token.text;

    // 'ctx.textBaseline' is always set as 'middle', for sake of
    // the bias of "Microsoft YaHei".
    let textVerticalAlign = token.textVerticalAlign;
    let y = lineTop + lineHeight / 2;
    if (textVerticalAlign === 'top') {
        y = lineTop + token.height / 2;
    }
    else if (textVerticalAlign === 'bottom') {
        y = lineTop + lineHeight - token.height / 2;
    }

    !token.isLineHolder && needDrawBackground(tokenStyle) && drawBackground(
        hostEl,
        ctx,
        tokenStyle,
        textAlign === 'right'
            ? x - token.width
            : textAlign === 'center'
            ? x - token.width / 2
            : x,
        y - token.height / 2,
        token.width,
        token.height
    );

    let textPadding = token.textPadding;
    if (textPadding) {
        x = getTextXForPadding(x, textAlign, textPadding);
        y -= token.height / 2 - textPadding[2] - token.textHeight / 2;
    }

    setCtx(ctx, 'shadowBlur', dataUtil.retrieve3(tokenStyle.textShadowBlur, style.textShadowBlur, 0));
    setCtx(ctx, 'shadowColor', tokenStyle.textShadowColor || style.textShadowColor || 'transparent');
    setCtx(ctx, 'shadowOffsetX', dataUtil.retrieve3(tokenStyle.textShadowOffsetX, style.textShadowOffsetX, 0));
    setCtx(ctx, 'shadowOffsetY', dataUtil.retrieve3(tokenStyle.textShadowOffsetY, style.textShadowOffsetY, 0));
    setCtx(ctx, 'textAlign', textAlign);
    // Force baseline to be "middle". Otherwise, if using "top", the
    // text will offset downward a little bit in font "Microsoft YaHei".
    setCtx(ctx, 'textBaseline', 'middle');
    setCtx(ctx, 'font', token.font || DEFAULT_FONT);

    let textStrokeWidth = dataUtil.retrieve2(tokenStyle.textStrokeWidth, style.textStrokeWidth);
    let textStroke = getStroke(tokenStyle.textStroke || style.textStroke, textStrokeWidth);
    let textFill = getFill(tokenStyle.textFill || style.textFill);

    // Fill after stroke so the outline will not cover the main part.
    if (textStroke) {
        setCtx(ctx, 'lineWidth', textStrokeWidth);
        setCtx(ctx, 'strokeStyle', textStroke);
        ctx.strokeText(token.text, x, y);
    }
    if (textFill) {
        setCtx(ctx, 'fillStyle', textFill);
        ctx.fillText(token.text, x, y);
    }
}

function needDrawBackground(style) {
    return !!(
        style.textBackgroundColor
        || (style.textBorderWidth && style.textBorderColor)
    );
}

// style: {textBackgroundColor, textBorderWidth, textBorderColor, textBorderRadius, text}
// shape: {x, y, width, height}
function drawBackground(hostEl, ctx, style, x, y, width, height) {
    let textBackgroundColor = style.textBackgroundColor;
    let textBorderWidth = style.textBorderWidth;
    let textBorderColor = style.textBorderColor;
    let isPlainBg = dataUtil.isString(textBackgroundColor);
    let originalGlobalAlpha;

    setCtx(ctx, 'shadowBlur', style.textBoxShadowBlur || 0);
    setCtx(ctx, 'shadowColor', style.textBoxShadowColor || 'transparent');
    setCtx(ctx, 'shadowOffsetX', style.textBoxShadowOffsetX || 0);
    setCtx(ctx, 'shadowOffsetY', style.textBoxShadowOffsetY || 0);

    if (isPlainBg || (textBorderWidth && textBorderColor)) {
        ctx.beginPath();
        let textBorderRadius = style.textBorderRadius;
        if (!textBorderRadius) {
            ctx.rect(x, y, width, height);
        }else {
            roundRectHelper.buildPath(ctx, {
                x: x, y: y, width: width, height: height, r: textBorderRadius
            });
        }
        ctx.closePath();
    }

    if (isPlainBg) {
        setCtx(ctx, 'fillStyle', textBackgroundColor);

        if (style.fillOpacity != null) {
            originalGlobalAlpha = ctx.globalAlpha;
            ctx.globalAlpha = style.fillOpacity * style.opacity;
            ctx.fill();
            ctx.globalAlpha = originalGlobalAlpha;
        }else {
            ctx.fill();
        }
    }
    else if (dataUtil.isObject(textBackgroundColor)) {
        let image = textBackgroundColor.image;

        image = imageHelper.createOrUpdateImage(
            image, null, hostEl, onBgImageLoaded, textBackgroundColor
        );
        if (image && imageHelper.isImageReady(image)) {
            ctx.drawImage(image, x, y, width, height);
        }
    }

    if (textBorderWidth && textBorderColor) {
        setCtx(ctx, 'lineWidth', textBorderWidth);
        setCtx(ctx, 'strokeStyle', textBorderColor);

        if (style.strokeOpacity != null) {
            originalGlobalAlpha = ctx.globalAlpha;
            ctx.globalAlpha = style.strokeOpacity * style.opacity;
            ctx.stroke();
            ctx.globalAlpha = originalGlobalAlpha;
        }else {
            ctx.stroke();
        }
    }
}

function onBgImageLoaded(image, textBackgroundColor) {
    // Replace image, so that `contain/text_util.js#parseRichText`
    // will get correct result in next tick.
    textBackgroundColor.image = image;
}

export function getBoxPosition(out, hostEl, style, rect) {
    let baseX = style.x || 0;
    let baseY = style.y || 0;
    let textAlign = style.textAlign;
    let textVerticalAlign = style.textVerticalAlign;

    // Text position represented by coord
    if (rect) {
        let textPosition = style.textPosition;
        if (textPosition instanceof Array) {
            // Percent
            baseX = rect.x1 + parsePercent(textPosition[0], rect.width);
            baseY = rect.y1 + parsePercent(textPosition[1], rect.height);
        } else {
            let res = (hostEl && hostEl.calculateTextPosition)
                ? hostEl.calculateTextPosition(_tmpTextPositionResult, style, rect)
                : calculateTextPosition(_tmpTextPositionResult, style, rect);
            baseX = res.x;
            baseY = res.y;
            // Default align and baseline when has textPosition
            textAlign = textAlign || res.textAlign;
            textVerticalAlign = textVerticalAlign || res.textVerticalAlign;
        }

        // textOffset is only support in RectText, otherwise
        // we have to adjust boundingRect for textOffset.
        let textOffset = style.textOffset;
        if (textOffset) {
            baseX += textOffset[0];
            baseY += textOffset[1];
        }
    }

    out = out || {};
    out.baseX = baseX;
    out.baseY = baseY;
    out.textAlign = textAlign;
    out.textVerticalAlign = textVerticalAlign;

    return out;
}


function setCtx(ctx, prop, value) {
    ctx[prop] = fixShadow(ctx, prop, value);
    return ctx[prop];
}

/**
 * @param {String} [stroke] If specified, do not check style.textStroke.
 * @param {String} [lineWidth] If specified, do not check style.textStroke.
 * @param {Number} style
 */
export function getStroke(stroke, lineWidth) {
    return (stroke == null || lineWidth <= 0 || stroke === 'transparent' || stroke === 'none')
        ? null
        // TODO pattern and gradient?
        : (stroke.image || stroke.colorStops)
        ? '#000'
        : stroke;
}

export function getFill(fill) {
    return (fill == null || fill === 'none')
        ? null
        // TODO pattern and gradient?
        : (fill.image || fill.colorStops)
        ? '#000'
        : fill;
}

export function parsePercent(value, maxValue) {
    if (typeof value === 'string') {
        if (value.lastIndexOf('%') >= 0) {
            return parseFloat(value) / 100 * maxValue;
        }
        return parseFloat(value);
    }
    return value;
}

function getTextXForPadding(x, textAlign, textPadding) {
    return textAlign === 'right'
        ? (x - textPadding[1])
        : textAlign === 'center'
        ? (x + textPadding[3] / 2 - textPadding[1] / 2)
        : (x + textPadding[3]);
}

/**
 * @param {String} text
 * @param {Style} style
 * @return {Boolean}
 */
export function needDrawText(text, style) {
    return text != null
        && (text
            || style.textBackgroundColor
            || (style.textBorderWidth && style.textBorderColor)
            || style.textPadding
        );
}

/**
 * @public
 * @param {String} text
 * @param {String} font
 * @return {Number} width
 */
export function getWidth(text, font) {
    font = font || DEFAULT_FONT;
    let key = text + ':' + font;
    if (textWidthCache[key]) {
        return textWidthCache[key];
    }

    let textLines = (text + '').split('\n');
    let width = 0;

    for (let i = 0, l = textLines.length; i < l; i++) {
        // measureText may be overrided in SVG.
        width = mathMax(measureText(textLines[i], font).width, width);
    }

    if (textWidthCacheCounter > TEXT_CACHE_MAX) {
        textWidthCacheCounter = 0;
        textWidthCache = {};
    }
    textWidthCacheCounter++;
    textWidthCache[key] = width;

    return width;
}

/**
 * @public
 * @param {String} text
 * @param {String} font
 * @param {String} [textAlign='left']
 * @param {String} [textVerticalAlign='top']
 * @param {Array<Number>} [textPadding]
 * @param {Object} [rich]
 * @param {Object} [truncate]
 * @return {Object} {x, y, width, height, lineHeight}
 */
export function getBoundingRect(text, font, textAlign, textVerticalAlign, textPadding, textLineHeight, rich, truncate) {
    return rich
        ? getRichTextRect(text, font, textAlign, textVerticalAlign, textPadding, textLineHeight, rich, truncate)
        : getPlainTextRect(text, font, textAlign, textVerticalAlign, textPadding, textLineHeight, truncate);
}

function getPlainTextRect(text, font, textAlign, textVerticalAlign, textPadding, textLineHeight, truncate) {
    let contentBlock = parsePlainText(text, font, textPadding, textLineHeight, truncate);
    let outerWidth = getWidth(text, font);
    if (textPadding) {
        outerWidth += textPadding[1] + textPadding[3];
    }
    let outerHeight = contentBlock.outerHeight;
    let x1 = adjustTextX(0, outerWidth, textAlign);
    let y1 = adjustTextY(0, outerHeight, textVerticalAlign);
    let x2 = x1+outerWidth;
    let y2 = y1+outerHeight;

    let rect = new BoundingRect(x1, y1, x2, y2, outerWidth, outerHeight);
    rect.lineHeight = contentBlock.lineHeight;
    return rect;
}

function getRichTextRect(text, font, textAlign, textVerticalAlign, textPadding, textLineHeight, rich, truncate) {
    let contentBlock = parseRichText(text, {
        rich: rich,
        truncate: truncate,
        font: font,
        textAlign: textAlign,
        textPadding: textPadding,
        textLineHeight: textLineHeight
    });

    let outerWidth = contentBlock.outerWidth;
    let outerHeight = contentBlock.outerHeight;
    let x1 = adjustTextX(0, outerWidth, textAlign);
    let y1 = adjustTextY(0, outerHeight, textVerticalAlign);
    let x2 = x1+outerWidth;
    let y2 = y1+outerHeight;

    return new BoundingRect(x1, y1, x2, y2, outerWidth, outerHeight);
}

/**
 * @public
 * @param {Number} x
 * @param {Number} width
 * @param {String} [textAlign='left']
 * @return {Number} Adjusted x.
 */
export function adjustTextX(x, width, textAlign) {
    // FIXME: Right to left language
    if (textAlign === 'right') {
        x -= width;
    } else if (textAlign === 'center') {
        x -= width / 2;
    }
    return x;
}

/**
 * @public
 * @param {Number} y
 * @param {Number} height
 * @param {String} [textVerticalAlign='top']
 * @return {Number} Adjusted y.
 */
export function adjustTextY(y, height, textVerticalAlign) {
    if (textVerticalAlign === 'middle') {
        y -= height / 2;
    } else if (textVerticalAlign === 'bottom') {
        y -= height;
    }
    return y;
}

/**
 * Follow same interface to `Displayable.prototype.calculateTextPosition`.
 * @public
 * @param {Obejct} [out] Prepared out object. If not input, auto created in the method.
 * @param {Style} style where `textPosition` and `textDistance` are visited.
 * @param {Object} rect {x1, y1, x2, y2, width, height} Rect of the host elment, according to which the text positioned.
 * @return {Object} The input `out`. Set: {x, y, textAlign, textVerticalAlign}
 */
export function calculateTextPosition(out, style, rect) {
    let textPosition = style.textPosition;
    let distance = style.textDistance || 0;
    let x = rect.x1;
    let y = rect.y1;
    let height = rect.height;
    let width = rect.width;
    let halfHeight = height / 2;
    let textAlign = 'left';
    let textVerticalAlign = 'top';

    switch (textPosition) {
        case 'left':
            x -= distance;
            y += halfHeight;
            textAlign = 'right';
            textVerticalAlign = 'middle';
            break;
        case 'right':
            x += distance + width;
            y += halfHeight;
            textVerticalAlign = 'middle';
            break;
        case 'top':
            x += width / 2;
            y -= distance;
            textAlign = 'center';
            textVerticalAlign = 'bottom';
            break;
        case 'bottom':
            x += width / 2;
            y += height + distance;
            textAlign = 'center';
            break;
        case 'inside':
            x += width / 2;
            y += halfHeight;
            textAlign = 'center';
            textVerticalAlign = 'middle';
            break;
        case 'insideLeft':
            x += distance;
            y += halfHeight;
            textVerticalAlign = 'middle';
            break;
        case 'insideRight':
            x += width - distance;
            y += halfHeight;
            textAlign = 'right';
            textVerticalAlign = 'middle';
            break;
        case 'insideTop':
            x += width / 2;
            y += distance;
            textAlign = 'center';
            break;
        case 'insideBottom':
            x += width / 2;
            y += height - distance;
            textAlign = 'center';
            textVerticalAlign = 'bottom';
            break;
        case 'insideTopLeft':
            x += distance;
            y += distance;
            break;
        case 'insideTopRight':
            x += width - distance;
            y += distance;
            textAlign = 'right';
            break;
        case 'insideBottomLeft':
            x += distance;
            y += height - distance;
            textVerticalAlign = 'bottom';
            break;
        case 'insideBottomRight':
            x += width - distance;
            y += height - distance;
            textAlign = 'right';
            textVerticalAlign = 'bottom';
            break;
    }

    out = out || {};
    out.x = x;
    out.y = y;
    out.textAlign = textAlign;
    out.textVerticalAlign = textVerticalAlign;

    return out;
}

/**
 * To be removed. But still do not remove in case that some one has imported it.
 * @deprecated
 * @public
 * @param {stirng} textPosition
 * @param {Object} rect {x, y, width, height}
 * @param {Number} distance
 * @return {Object} {x, y, textAlign, textVerticalAlign}
 */
export function adjustTextPositionOnRect(textPosition, rect, distance) {
    let dummyStyle = {textPosition: textPosition, textDistance: distance};
    return calculateTextPosition({}, dummyStyle, rect);
}

/**
 * Show ellipsis if overflow.
 *
 * @public
 * @param  {String} text
 * @param  {String} containerWidth
 * @param  {String} font
 * @param  {Number} [ellipsis='...']
 * @param  {Object} [options]
 * @param  {Number} [options.maxIterations=3]
 * @param  {Number} [options.minChar=0] If truncate result are less
 *                  then minChar, ellipsis will not show, which is
 *                  better for user hint in some cases.
 * @param  {Number} [options.placeholder=''] When all truncated, use the placeholder.
 * @return {String}
 */
export function truncateText(text, containerWidth, font, ellipsis, options) {
    if (!containerWidth) {
        return '';
    }

    let textLines = (text + '').split('\n');
    options = prepareTruncateOptions(containerWidth, font, ellipsis, options);

    // FIXME:
    // It is not appropriate that every line has '...' when truncate multiple lines.
    for (let i = 0, len = textLines.length; i < len; i++) {
        textLines[i] = truncateSingleLine(textLines[i], options);
    }

    return textLines.join('\n');
}

function prepareTruncateOptions(containerWidth, font, ellipsis, options) {
    options = extend({}, options);
    options.font = font;
    ellipsis = retrieve2(ellipsis, '...');
    options.maxIterations = retrieve2(options.maxIterations, 2);
    let minChar = options.minChar = retrieve2(options.minChar, 0);
    // FIXME:
    // Other languages?
    options.cnCharWidth = getWidth('国', font);
    // FIXME:
    // Consider proportional font?
    let ascCharWidth = options.ascCharWidth = getWidth('a', font);
    options.placeholder = retrieve2(options.placeholder, '');

    // Example 1: minChar: 3, text: 'asdfzxcv', truncate result: 'asdf', but not: 'a...'.
    // Example 2: minChar: 3, text: '维度', truncate result: '维', but not: '...'.
    let contentWidth = containerWidth = mathMax(0, containerWidth - 1); // Reserve some gap.
    for (let i = 0; i < minChar && contentWidth >= ascCharWidth; i++) {
        contentWidth -= ascCharWidth;
    }

    let ellipsisWidth = getWidth(ellipsis, font);
    if (ellipsisWidth > contentWidth) {
        ellipsis = '';
        ellipsisWidth = 0;
    }

    contentWidth = containerWidth - ellipsisWidth;
    options.ellipsis = ellipsis;
    options.ellipsisWidth = ellipsisWidth;
    options.contentWidth = contentWidth;
    options.containerWidth = containerWidth;

    return options;
}

function truncateSingleLine(textLine, options) {
    let containerWidth = options.containerWidth;
    let font = options.font;
    let contentWidth = options.contentWidth;

    if (!containerWidth) {
        return '';
    }

    let lineWidth = getWidth(textLine, font);

    if (lineWidth <= containerWidth) {
        return textLine;
    }

    for (let j = 0; ; j++) {
        if (lineWidth <= contentWidth || j >= options.maxIterations) {
            textLine += options.ellipsis;
            break;
        }

        let subLength = j === 0
            ? estimateLength(textLine, contentWidth, options.ascCharWidth, options.cnCharWidth)
            : lineWidth > 0
            ? mathFloor(textLine.length * contentWidth / lineWidth)
            : 0;

        textLine = textLine.substr(0, subLength);
        lineWidth = getWidth(textLine, font);
    }

    if (textLine === '') {
        textLine = options.placeholder;
    }

    return textLine;
}

function estimateLength(text, contentWidth, ascCharWidth, cnCharWidth) {
    let width = 0;
    let i = 0;
    for (let len = text.length; i < len && width < contentWidth; i++) {
        let charCode = text.charCodeAt(i);
        width += (0 <= charCode && charCode <= 127) ? ascCharWidth : cnCharWidth;
    }
    return i;
}

/**
 * @public
 * @param {String} font
 * @return {Number} line height
 */
export function getLineHeight(font) {
    // FIXME: A rough approach.
    return getWidth('国', font);
}

/**
 * @public
 * @param {String} text
 * @param {String} font
 * @return {Object} width
 */
export function measureText(text, font) {
    return methods.measureText(text, font);
}

// Avoid assign to an exported variable, for transforming to cjs.
methods.measureText = function (text, font) {
    let ctx = getContext();
    ctx.font = font || DEFAULT_FONT;
    return ctx.measureText(text);
};

/**
 * @public
 * @param {String} text
 * @param {String} font
 * @param {Object} [truncate]
 * @return {Object} block: {lineHeight, lines, height, outerHeight, canCacheByTextString}
 *  Notice: for performance, do not calculate outerWidth util needed.
 *  `canCacheByTextString` means the result `lines` is only determined by the input `text`.
 *  Thus we can simply comparing the `input` text to determin whether the result changed,
 *  without travel the result `lines`.
 */
export function parsePlainText(text, font, padding, textLineHeight, truncate) {
    text != null && (text += '');

    let lineHeight = retrieve2(textLineHeight, getLineHeight(font));
    let lines = text ? text.split('\n') : [];
    let height = lines.length * lineHeight;
    let outerHeight = height;
    let canCacheByTextString = true;

    if (padding) {
        outerHeight += padding[0] + padding[2];
    }

    if (text && truncate) {
        canCacheByTextString = false;
        let truncOuterHeight = truncate.outerHeight;
        let truncOuterWidth = truncate.outerWidth;
        if (truncOuterHeight != null && outerHeight > truncOuterHeight) {
            text = '';
            lines = [];
        } else if (truncOuterWidth != null) {
            let options = prepareTruncateOptions(
                truncOuterWidth - (padding ? padding[1] + padding[3] : 0),
                font,
                truncate.ellipsis,
                {minChar: truncate.minChar, placeholder: truncate.placeholder}
            );

            // FIXME:
            // It is not appropriate that every line has '...' when truncate multiple lines.
            for (let i = 0, len = lines.length; i < len; i++) {
                lines[i] = truncateSingleLine(lines[i], options);
            }
        }
    }

    return {
        lines: lines,
        height: height,
        outerHeight: outerHeight,
        lineHeight: lineHeight,
        canCacheByTextString: canCacheByTextString
    };
}

/**
 * For example: 'some text {a|some text}other text{b|some text}xxx{c|}xxx'
 * Also consider 'bbbb{a|xxx\nzzz}xxxx\naaaa'.
 *
 * @public
 * @param {String} text
 * @param {Object} style
 * @return {Object} block
 * {
 *      width,
 *      height,
 *      lines: [{
 *          lineHeight,
 *          width,
 *          tokens: [[{
 *              styleName,
 *              text,
 *              width,      // include textPadding
 *              height,     // include textPadding
 *              textWidth, // pure text width
 *              textHeight, // pure text height
 *              lineHeihgt,
 *              font,
 *              textAlign,
 *              textVerticalAlign
 *          }], [...], ...]
 *      }, ...]
 * }
 * If styleName is undefined, it is plain text.
 */
export function parseRichText(text, style) {
    let contentBlock = {lines: [], width: 0, height: 0};

    text != null && (text += '');
    if (!text) {
        return contentBlock;
    }

    let lastIndex = STYLE_REG.lastIndex = 0;
    let result;
    while ((result = STYLE_REG.exec(text)) != null) {
        let matchedIndex = result.index;
        if (matchedIndex > lastIndex) {
            pushTokens(contentBlock, text.substring(lastIndex, matchedIndex));
        }
        pushTokens(contentBlock, result[2], result[1]);
        lastIndex = STYLE_REG.lastIndex;
    }

    if (lastIndex < text.length) {
        pushTokens(contentBlock, text.substring(lastIndex, text.length));
    }

    let lines = contentBlock.lines;
    let contentHeight = 0;
    let contentWidth = 0;
    let pendingList = [];// For `textWidth: 100%`
    let stlPadding = style.textPadding;
    let truncate = style.truncate;
    let truncateWidth = truncate && truncate.outerWidth;
    let truncateHeight = truncate && truncate.outerHeight;
    if (stlPadding) {
        truncateWidth != null && (truncateWidth -= stlPadding[1] + stlPadding[3]);
        truncateHeight != null && (truncateHeight -= stlPadding[0] + stlPadding[2]);
    }

    // Calculate layout info of tokens.
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let lineHeight = 0;
        let lineWidth = 0;

        for (let j = 0; j < line.tokens.length; j++) {
            let token = line.tokens[j];
            let tokenStyle = token.styleName && style.rich[token.styleName] || {};
            // textPadding should not inherit from style.
            let textPadding = token.textPadding = tokenStyle.textPadding;

            // textFont has been asigned to font by `normalizeStyle`.
            let font = token.font = tokenStyle.font || style.font;

            // textHeight can be used when textVerticalAlign is specified in token.
            let tokenHeight = token.textHeight = retrieve2(
                // textHeight should not be inherited, consider it can be specified
                // as box height of the block.
                tokenStyle.textHeight, getLineHeight(font)
            );
            textPadding && (tokenHeight += textPadding[0] + textPadding[2]);
            token.height = tokenHeight;
            token.lineHeight = retrieve3(
                tokenStyle.textLineHeight, style.textLineHeight, tokenHeight
            );

            token.textAlign = tokenStyle && tokenStyle.textAlign || style.textAlign;
            token.textVerticalAlign = tokenStyle && tokenStyle.textVerticalAlign || 'middle';

            if (truncateHeight != null && contentHeight + token.lineHeight > truncateHeight) {
                return {lines: [], width: 0, height: 0};
            }

            token.textWidth = getWidth(token.text, font);
            let tokenWidth = tokenStyle.textWidth;
            let tokenWidthNotSpecified = tokenWidth == null || tokenWidth === 'auto';

            // Percent width, can be `100%`, can be used in drawing separate
            // line when box width is needed to be auto.
            if (typeof tokenWidth === 'string' && tokenWidth.charAt(tokenWidth.length - 1) === '%') {
                token.percentWidth = tokenWidth;
                pendingList.push(token);
                tokenWidth = 0;
                // Do not truncate in this case, because there is no user case
                // and it is too complicated.
            }
            else {
                if (tokenWidthNotSpecified) {
                    tokenWidth = token.textWidth;

                    // FIXME: If image is not loaded and textWidth is not specified, calling
                    // `getBoundingRect()` will not get correct result.
                    let textBackgroundColor = tokenStyle.textBackgroundColor;
                    let bgImg = textBackgroundColor && textBackgroundColor.image;

                    // Use cases:
                    // (1) If image is not loaded, it will be loaded at render phase and call
                    // `dirty()` and `textBackgroundColor.image` will be replaced with the loaded
                    // image, and then the right size will be calculated here at the next tick.
                    // See `utils/text_util.js`.
                    // (2) If image loaded, and `textBackgroundColor.image` is image src string,
                    // use `imageHelper.findExistImage` to find cached image.
                    // `imageHelper.findExistImage` will always be called here before
                    // `imageHelper.createOrUpdateImage` in `utils/text_util.js#renderRichText`
                    // which ensures that image will not be rendered before correct size calcualted.
                    if (bgImg) {
                        bgImg = imageHelper.findExistImage(bgImg);
                        if (imageHelper.isImageReady(bgImg)) {
                            tokenWidth = mathMax(tokenWidth, bgImg.width * tokenHeight / bgImg.height);
                        }
                    }
                }

                let paddingW = textPadding ? textPadding[1] + textPadding[3] : 0;
                tokenWidth += paddingW;

                let remianTruncWidth = truncateWidth != null ? truncateWidth - lineWidth : null;

                if (remianTruncWidth != null && remianTruncWidth < tokenWidth) {
                    if (!tokenWidthNotSpecified || remianTruncWidth < paddingW) {
                        token.text = '';
                        token.textWidth = tokenWidth = 0;
                    } else {
                        token.text = truncateText(
                            token.text, remianTruncWidth - paddingW, font, truncate.ellipsis,
                            {minChar: truncate.minChar}
                        );
                        token.textWidth = getWidth(token.text, font);
                        tokenWidth = token.textWidth + paddingW;
                    }
                }
            }

            lineWidth += (token.width = tokenWidth);
            tokenStyle && (lineHeight = mathMax(lineHeight, token.lineHeight));
        }

        line.width = lineWidth;
        line.lineHeight = lineHeight;
        contentHeight += lineHeight;
        contentWidth = mathMax(contentWidth, lineWidth);
    }

    contentBlock.outerWidth = contentBlock.width = retrieve2(style.textWidth, contentWidth);
    contentBlock.outerHeight = contentBlock.height = retrieve2(style.textHeight, contentHeight);

    if (stlPadding) {
        contentBlock.outerWidth += stlPadding[1] + stlPadding[3];
        contentBlock.outerHeight += stlPadding[0] + stlPadding[2];
    }

    for (let i = 0; i < pendingList.length; i++) {
        let token = pendingList[i];
        let percentWidth = token.percentWidth;
        // Should not base on outerWidth, because token can not be placed out of padding.
        token.width = parseInt(percentWidth, 10) / 100 * contentWidth;
    }

    return contentBlock;
}

function pushTokens(block, str, styleName) {
    let isEmptyStr = str === '';
    let strs = str.split('\n');
    let lines = block.lines;

    for (let i = 0; i < strs.length; i++) {
        let text = strs[i];
        let token = {
            styleName: styleName,
            text: text,
            isLineHolder: !text && !isEmptyStr
        };

        // The first token should be appended to the last line.
        if (!i) {
            let tokens = (lines[lines.length - 1] || (lines[0] = {tokens: []})).tokens;

            // Consider cases:
            // (1) ''.split('\n') => ['', '\n', ''], the '' at the first item
            // (which is a placeholder) should be replaced by new token.
            // (2) A image backage, where token likes {a|}.
            // (3) A redundant '' will affect textAlign in line.
            // (4) tokens with the same tplName should not be merged, because
            // they should be displayed in different box (with border and padding).
            let tokensLen = tokens.length;
            (tokensLen === 1 && tokens[0].isLineHolder)
                ? (tokens[0] = token)
                // Consider text is '', only insert when it is the "lineHolder" or
                // "emptyStr". Otherwise a redundant '' will affect textAlign in line.
                : ((text || !tokensLen || isEmptyStr) && tokens.push(token));
        }
        // Other tokens always start a new line.
        else {
            // If there is '', insert it as a placeholder.
            lines.push({tokens: [token]});
        }
    }
}

export function makeFont(style) {
    // FIXME: in node-canvas fontWeight is before fontStyle
    // Use `fontSize` `fontFamily` to check whether font properties are defined.
    let font = (style.fontSize || style.fontFamily) && [
        style.fontStyle,
        style.fontWeight,
        (style.fontSize || 12) + 'px',
        // If font properties are defined, `fontFamily` should not be ignored.
        style.fontFamily || 'sans-serif'
    ].join(' ');
    return font && trim(font) || style.textFont || style.font;
}
