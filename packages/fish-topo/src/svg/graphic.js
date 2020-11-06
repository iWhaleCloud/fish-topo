import * as matrixUtil from '../utils/affine_matrix_util';
import * as textUtil from '../utils/text_util';
import PathProxy from '../graphic/PathProxy';
import BoundingRect from '../graphic/BoundingRect';
import Text from '../graphic/Text';
import {createElement} from './core';
import {PI,PI2,mathRound,mathAbs,mathCos,mathSin} from '../utils/constants';

// TODO
// 1. shadow
// 2. Image: sx, sy, sw, sh
let CMD = PathProxy.CMD;
let NONE = 'none';
let degree = 180 / PI;
let EPSILON = 1e-4;

function round4(val) {
    return mathRound(val * 1e4) / 1e4;
}

function isAroundZero(val) {
    return val < EPSILON && val > -EPSILON;
}

function pathHasFill(style, isText) {
    let fill = isText ? style.textFill : style.fill;
    return fill != null && fill !== NONE;
}

function pathHasStroke(style, isText) {
    let stroke = isText ? style.textStroke : style.stroke;
    return stroke != null && stroke !== NONE;
}

function applyTransform(svgEl, m) {
    if (m) {
        attr(svgEl, 'transform', 'matrix(' + Array.prototype.join.call(m, ',') + ')');
    }
}

function attr(el, key, val) {
    if (!val || val.type !== 'linear' && val.type !== 'radial') {
        // Don't set attribute for gradient, since it need new dom nodes
        el.setAttribute(key, val);
    }
}

function attrXLink(el, key, val) {
    el.setAttributeNS('http://www.w3.org/1999/xlink', key, val);
}

function bindStyle(svgEl, style, isText, el) {
    if (pathHasFill(style, isText)) {
        let fill = isText ? style.textFill : style.fill;
        fill = fill === 'transparent' ? NONE : fill;
        attr(svgEl, 'fill', fill);
        attr(svgEl, 'fill-opacity', style.fillOpacity != null ? style.fillOpacity * style.opacity : style.opacity);
    }else {
        attr(svgEl, 'fill', NONE);
    }

    if (pathHasStroke(style, isText)) {
        let stroke = isText ? style.textStroke : style.stroke;
        stroke = stroke === 'transparent' ? NONE : stroke;
        attr(svgEl, 'stroke', stroke);
        let strokeWidth = isText
            ? style.textStrokeWidth
            : style.lineWidth;
        let strokeScale = !isText && style.strokeNoScale
            ? el.getLineScale()
            : 1;
        attr(svgEl, 'stroke-width', strokeWidth / strokeScale);
        // stroke then fill for text; fill then stroke for others
        attr(svgEl, 'paint-order', isText ? 'stroke' : 'fill');
        attr(svgEl, 'stroke-opacity', style.strokeOpacity != null ? style.strokeOpacity : style.opacity);
        let lineDash = style.lineDash;
        if (lineDash) {
            attr(svgEl, 'stroke-dasharray', style.lineDash.join(','));
            attr(svgEl, 'stroke-dashoffset', mathRound(style.lineDashOffset || 0));
        }else {
            attr(svgEl, 'stroke-dasharray', '');
        }

        // PENDING
        style.lineCap && attr(svgEl, 'stroke-linecap', style.lineCap);
        style.lineJoin && attr(svgEl, 'stroke-linejoin', style.lineJoin);
        style.miterLimit && attr(svgEl, 'stroke-miterlimit', style.miterLimit);
    }else {
        attr(svgEl, 'stroke', NONE);
    }
}

/**
 * @class fishTopo.svg.SVGPath
 * 
 * @docauthor 大漠穷秋 damoqiongqiu@126.com
 */
function pathDataToString(path) {
    let str = [];
    let data = path.data;
    let dataLength = path.len();
    let cmd = 0;
    let cmdStr = '';
    let nData = 0;
    let cx = 0;
    let cy = 0;
    let rx = 0;
    let ry = 0;
    let theta = 0;
    let dTheta = 0;
    let psi = 0;
    let clockwise = 0;
    let dThetaPositive = 0;
    let isCircle = false;
    let unifiedTheta = 0;
    let large = false;
    let x = 0;
    let y = 0;
    let w = 0;
    let h = 0;
    let x0 = 0;
    let y0 = 0;

    for (let i = 0; i < dataLength;) {
        cmd = data[i++];
        cmdStr = '';
        nData = 0;
        switch (cmd) {
            case CMD.M:
                cmdStr = 'M';
                nData = 2;
                break;
            case CMD.L:
                cmdStr = 'L';
                nData = 2;
                break;
            case CMD.Q:
                cmdStr = 'Q';
                nData = 4;
                break;
            case CMD.C:
                cmdStr = 'C';
                nData = 6;
                break;
            case CMD.A:
                cx = data[i++];
                cy = data[i++];
                rx = data[i++];
                ry = data[i++];
                theta = data[i++];
                dTheta = data[i++];
                psi = data[i++];
                clockwise = data[i++];

                dThetaPositive = mathAbs(dTheta);
                isCircle = isAroundZero(dThetaPositive - PI2)
                    || (clockwise ? dTheta >= PI2 : -dTheta >= PI2);

                // Mapping to 0~2PI
                unifiedTheta = dTheta > 0 ? dTheta % PI2 : (dTheta % PI2 + PI2);

                large = false;
                if (isCircle) {
                    large = true;
                }
                else if (isAroundZero(dThetaPositive)) {
                    large = false;
                }
                else {
                    large = (unifiedTheta >= PI) === !!clockwise;
                }

                x0 = round4(cx + rx * mathCos(theta));
                y0 = round4(cy + ry * mathSin(theta));

                // It will not draw if start point and end point are exactly the same
                // We need to shift the end point with a small value
                // FIXME A better way to draw circle ?
                if (isCircle) {
                    if (clockwise) {
                        dTheta = PI2 - 1e-4;
                    }
                    else {
                        dTheta = -PI2 + 1e-4;
                    }

                    large = true;

                    if (i === 9) {
                        // Move to (x0, y0) only when CMD.A comes at the
                        // first position of a shape.
                        // For instance, when drawing a ring, CMD.A comes
                        // after CMD.M, so it's unnecessary to move to
                        // (x0, y0).
                        str.push('M', x0, y0);
                    }
                }

                x = round4(cx + rx * mathCos(theta + dTheta));
                y = round4(cy + ry * mathSin(theta + dTheta));

                // FIXME Ellipse
                str.push('A', round4(rx), round4(ry),
                    mathRound(psi * degree), +large, +clockwise, x, y);
                break;
            case CMD.Z:
                cmdStr = 'Z';
                break;
            case CMD.R:
                x = round4(data[i++]);
                y = round4(data[i++]);
                w = round4(data[i++]);
                h = round4(data[i++]);
                str.push(
                    'M', x, y,
                    'L', x + w, y,
                    'L', x + w, y + h,
                    'L', x, y + h,
                    'L', x, y
                );
                break;
        }
        cmdStr && str.push(cmdStr);
        for (let j = 0; j < nData; j++) {
            // PENDING With scale
            str.push(round4(data[i++]));
        }
    }
    return str.join(' ');
}

/**
 * @class fishTopo.svg.SVGPath
 * 
 * @docauthor 大漠穷秋 damoqiongqiu@126.com
 */
let svgPath = {};
export {svgPath as path};

svgPath.render = function (el) {
    let style = el.style;

    let svgEl = el.__svgEl;
    if (!svgEl) {
        svgEl = createElement('path');
        el.__svgEl = svgEl;
    }

    if (!el.path) {
        el.createPathProxy();
    }
    let path = el.path;

    if (el.__dirtyPath) {
        path.beginPath();
        path.subPixelOptimize = false;
        el.buildPath(path, el.shape);
        el.__dirtyPath = false;

        let pathStr = pathDataToString(path);
        if (pathStr.indexOf('NaN') < 0) {
            // Ignore illegal path, which may happen such in out-of-range
            // data in Calendar series.
            attr(svgEl, 'd', pathStr);
        }
    }

    bindStyle(svgEl, style, false, el);
    applyTransform(svgEl, el.transform);

    if (style.text != null) {
        svgTextDrawRectText(el, el.getBoundingRect());
    }else {
        removeOldTextNode(el);
    }
};

/**
 * @class fishTopo.svg.SVGImage
 * 
 * @docauthor 大漠穷秋 damoqiongqiu@126.com
 */
let svgImage = {};
export {svgImage as image};

svgImage.render = function (el) {
    let style = el.style;
    let image = style.image;

    if (image instanceof HTMLImageElement) {
        let src = image.src;
        image = src;
    }
    if (!image) {
        return;
    }

    let x = style.x || 0;
    let y = style.y || 0;

    let dw = style.width;
    let dh = style.height;

    let svgEl = el.__svgEl;
    if (!svgEl) {
        svgEl = createElement('image');
        el.__svgEl = svgEl;
    }

    if (image !== el.__imageSrc) {
        attrXLink(svgEl, 'href', image);
        // Caching image src
        el.__imageSrc = image;
    }

    attr(svgEl, 'width', dw);
    attr(svgEl, 'height', dh);

    attr(svgEl, 'x', x);
    attr(svgEl, 'y', y);

    applyTransform(svgEl, el.transform);

    if (style.text != null) {
        svgTextDrawRectText(el, el.getBoundingRect());
    }else {
        removeOldTextNode(el);
    }
};

/**
 * @class fishTopo.svg.SVGText
 * 
 * @docauthor 大漠穷秋 damoqiongqiu@126.com
 */
let svgText = {};
export {svgText as text};
let _tmpTextHostRect = new BoundingRect();
let _tmpTextBoxPos = {};
let _tmpTextTransform = [];
let TEXT_ALIGN_TO_ANCHRO = {
    left: 'start',
    right: 'end',
    center: 'middle',
    middle: 'middle'
};

/**
 * @param {Element} el
 * @param {Object|boolean} [hostRect] {x, y, width, height}
 *        If set false, rect text is not used.
 */
let svgTextDrawRectText = function (el, hostRect) {
    let style = el.style;
    let elTransform = el.transform;
    let needTransformTextByHostEl = el instanceof Text || style.transformText;

    el.__dirty && textUtil.normalizeTextStyle(style, true);

    let text = style.text;
    // Convert to string
    text != null && (text += '');
    if (!textUtil.needDrawText(text, style)) {
        return;
    }
    // render empty text for svg if no text but need draw text.
    text == null && (text = '');

    // Follow the setting in the canvas renderer, if not transform the
    // text, transform the hostRect, by which the text is located.
    if (!needTransformTextByHostEl && elTransform) {
        _tmpTextHostRect.copy(hostRect);
        _tmpTextHostRect.applyTransform(elTransform);
        hostRect = _tmpTextHostRect;
    }

    let textSvgEl = el.__textSvgEl;
    if (!textSvgEl) {
        textSvgEl = createElement('text');
        el.__textSvgEl = textSvgEl;
    }

    // style.font has been normalized by `normalizeTextStyle`.
    let textSvgElStyle = textSvgEl.style;
    let font = style.font || textUtil.DEFAULT_FONT;
    let computedFont = textSvgEl.__computedFont;
    if (font !== textSvgEl.__styleFont) {
        textSvgElStyle.font = textSvgEl.__styleFont = font;
        // The computedFont might not be the orginal font if it is illegal font.
        computedFont = textSvgEl.__computedFont = textSvgElStyle.font;
    }

    let textPadding = style.textPadding;
    let textLineHeight = style.textLineHeight;

    let contentBlock = el.__textCotentBlock;
    if (!contentBlock || el.__dirtyText) {
        contentBlock = el.__textCotentBlock = textUtil.parsePlainText(
            text, computedFont, textPadding, textLineHeight, style.truncate
        );
    }

    let outerHeight = contentBlock.outerHeight;
    let lineHeight = contentBlock.lineHeight;

    textUtil.getBoxPosition(_tmpTextBoxPos, el, style, hostRect);
    let baseX = _tmpTextBoxPos.baseX;
    let baseY = _tmpTextBoxPos.baseY;
    let textAlign = _tmpTextBoxPos.textAlign || 'left';
    let textVerticalAlign = _tmpTextBoxPos.textVerticalAlign;

    setTextTransform(
        textSvgEl, needTransformTextByHostEl, elTransform, style, hostRect, baseX, baseY
    );

    let boxY = textUtil.adjustTextY(baseY, outerHeight, textVerticalAlign);
    let textX = baseX;
    let textY = boxY;

    // TODO needDrawBg
    if (textPadding) {
        textX = getTextXForPadding(baseX, textAlign, textPadding);
        textY += textPadding[0];
    }

    // `textBaseline` is set as 'middle'.
    textY += lineHeight / 2;

    bindStyle(textSvgEl, style, true, el);

    // FIXME
    // Add a <style> to reset all of the text font as inherit?
    // otherwise the outer <style> may set the unexpected style.

    // Font may affect position of each tspan elements
    let canCacheByTextString = contentBlock.canCacheByTextString;
    let tspanList = el.__tspanList || (el.__tspanList = []);
    let tspanOriginLen = tspanList.length;

    // Optimize for most cases, just compare text string to determine change.
    if (canCacheByTextString && el.__canCacheByTextString && el.__text === text) {
        if (el.__dirtyText && tspanOriginLen) {
            for (let idx = 0; idx < tspanOriginLen; ++idx) {
                updateTextLocation(tspanList[idx], textAlign, textX, textY + idx * lineHeight);
            }
        }
    }else {
        el.__text = text;
        el.__canCacheByTextString = canCacheByTextString;
        let textLines = contentBlock.lines;
        let nTextLines = textLines.length;

        let idx = 0;
        for (; idx < nTextLines; idx++) {
            // Using cached tspan elements
            let tspan = tspanList[idx];
            let singleLineText = textLines[idx];

            if (!tspan) {
                tspan = tspanList[idx] = createElement('tspan');
                textSvgEl.appendChild(tspan);
                tspan.appendChild(document.createTextNode(singleLineText));
            }else if (tspan.__topoText !== singleLineText) {
                tspan.innerHTML = '';
                tspan.appendChild(document.createTextNode(singleLineText));
            }
            updateTextLocation(tspan, textAlign, textX, textY + idx * lineHeight);
        }
        // Remove unused tspan elements
        if (tspanOriginLen > nTextLines) {
            for (; idx < tspanOriginLen; idx++) {
                textSvgEl.removeChild(tspanList[idx]);
            }
            tspanList.length = nTextLines;
        }
    }
};

function setTextTransform(textSvgEl, needTransformTextByHostEl, elTransform, style, hostRect, baseX, baseY) {
    matrixUtil.identity(_tmpTextTransform);

    if (needTransformTextByHostEl && elTransform) {
        matrixUtil.copy(_tmpTextTransform, elTransform);
    }

    // textRotation only apply in RectText.
    let textRotation = style.textRotation;
    if (hostRect && textRotation) {
        let origin = style.textOrigin;
        if (origin === 'center') {
            baseX = hostRect.width / 2 + hostRect.x1;
            baseY = hostRect.height / 2 + hostRect.y1;
        }else if (origin) {
            baseX = origin[0] + hostRect.x1;
            baseY = origin[1] + hostRect.y1;
        }

        _tmpTextTransform[4] -= baseX;
        _tmpTextTransform[5] -= baseY;
        // Positive: anticlockwise
        _tmpTextTransform = matrixUtil.rotate(_tmpTextTransform, textRotation);
        _tmpTextTransform[4] += baseX;
        _tmpTextTransform[5] += baseY;
    }
    // See the definition in `Style.js#textOrigin`, the default
    // origin is from the result of `getBoxPosition`.

    applyTransform(textSvgEl, _tmpTextTransform);
}

// FIXME merge the same code with `helper/text.js#getTextXForPadding`;
function getTextXForPadding(x, textAlign, textPadding) {
    return textAlign === 'right'
        ? (x - textPadding[1])
        : textAlign === 'center'
        ? (x + textPadding[3] / 2 - textPadding[1] / 2)
        : (x + textPadding[3]);
}

function updateTextLocation(tspan, textAlign, x, y) {
    // Consider different font display differently in vertial align, we always
    // set vertialAlign as 'middle', and use 'y' to locate text vertically.
    attr(tspan, 'dominant-baseline', 'middle');
    attr(tspan, 'text-anchor', TEXT_ALIGN_TO_ANCHRO[textAlign]);
    attr(tspan, 'x', x);
    attr(tspan, 'y', y);
}

function removeOldTextNode(el) {
    if (el && el.__textSvgEl) {
        el.__textSvgEl.parentNode.removeChild(el.__textSvgEl);
        el.__textSvgEl = null;
        el.__tspanList = [];
        el.__text = null;
    }
}

svgText.drawRectText = svgTextDrawRectText;

svgText.render = function (el) {
    let style = el.style;
    if (style.text != null) {
        svgTextDrawRectText(el, false);
    }else {
        removeOldTextNode(el);
    }
};
