/* eslint-disable no-prototype-builtins */
/* eslint-disable no-unused-vars */
/* eslint-disable no-useless-escape */
import Group from '../graphic/Group';
import QImage from '../graphic/Image';
import Text from '../graphic/Text';
import Circle from '../graphic/shape/Circle';
import Rect from '../graphic/shape/Rect';
import Ellipse from '../graphic/shape/Ellipse';
import Line from '../graphic/line/Line';
import Polyline from '../graphic/line/Polyline';
import Path from '../graphic/Path';
import Polygon from '../graphic/shape/Polygon';
import LinearGradient from '../graphic/gradient/LinearGradient';
import Style from '../graphic/Style';
import * as matrixUtil from '../utils/affine_matrix_util';
import { createFromString } from '../utils/path_util';
import { isString, extend, trim, each } from '../utils/data_structure_util';
import { defaults } from '../utils/class_util';
import {mathMin} from '../utils/constants';

// Most of the values can be separated by comma and/or white space.
let DILIMITER_REG = /[\s,]+/;

/**
 * For big svg string, this method might be time consuming.
 * //TODO:try to move this into webworker.
 * @param {String} svg xml string
 * @return {Object} xml root.
 */
export function parseXML(svg) {
    if (isString(svg)) {
        let parser = new DOMParser();
        svg = parser.parseFromString(svg, 'text/xml');
    }

    // Document node. If using $.get, doc node may be input.
    if (svg.nodeType === 9) {
        svg = svg.firstChild;
    }
    // nodeName of <!DOCTYPE svg> is also 'svg'.
    while (svg.nodeName.toLowerCase() !== 'svg' || svg.nodeType !== 1) {
        svg = svg.nextSibling;
    }

    return svg;
}

/**
 * @class fishTopo.svg.SVGParser
 * 
 * This is a tool class for parsing SVG xml string to standard shape classes.
 * 
 * 这是一个工具类，用来把 SVG 格式的 xml 解析成 graphic 包中定义的标准类。
 * 
 * @docauthor 大漠穷秋 damoqiongqiu@126.com
 */

function SVGParser() {
    this._defs = {};
    this._root = null;
    this._isDefine = false;
    this._isText = false;
}

SVGParser.prototype={
    constructor:SVGParser,
    parse:function (xml, opt) {
        opt = opt || {};
    
        let svg = parseXML(xml);
    
        if (!svg) {
            throw new Error('Illegal svg');
        }
    
        let root = new Group();
        this._root = root;
        // parse view port
        let viewBox = svg.getAttribute('viewBox') || '';
    
        // If width/height not specified, means "100%" of `opt.width/height`.
        // TODO: Other percent value not supported yet.
        let width = parseFloat(svg.getAttribute('width') || opt.width);
        let height = parseFloat(svg.getAttribute('height') || opt.height);
        // If width/height not specified, set as null for output.
        isNaN(width) && (width = null);
        isNaN(height) && (height = null);
    
        // Apply inline style on svg element.
        parseAttributes(svg, root, null, true);
    
        let child = svg.firstChild;
        while (child) {
            this._parseNode(child, root);
            child = child.nextSibling;
        }
    
        let viewBoxRect;
        let viewBoxTransform;
    
        if (viewBox) {
            let viewBoxArr = trim(viewBox).split(DILIMITER_REG);
            // Some invalid case like viewBox: 'none'.
            if (viewBoxArr.length >= 4) {
                viewBoxRect = {
                    x: parseFloat(viewBoxArr[0] || 0),
                    y: parseFloat(viewBoxArr[1] || 0),
                    width: parseFloat(viewBoxArr[2]),
                    height: parseFloat(viewBoxArr[3])
                };
            }
        }
    
        if (viewBoxRect && width != null && height != null) {
            viewBoxTransform = makeViewBoxTransform(viewBoxRect, width, height);
    
            if (!opt.ignoreViewBox) {
                // If set transform on the output group, it probably bring trouble when
                // some users only intend to show the clipped content inside the viewBox,
                // but not intend to transform the output group. So we keep the output
                // group no transform. If the user intend to use the viewBox as a
                // camera, just set `opt.ignoreViewBox` as `true` and set transfrom
                // manually according to the viewBox info in the output of this method.
                let elRoot = root;
                root = new Group();
                root.add(elRoot);
                elRoot.scale = viewBoxTransform.scale.slice();
                elRoot.position = viewBoxTransform.position.slice();
            }
        }
    
        // Some shapes might be overflow the viewport, which should be
        // clipped despite whether the viewBox is used, as the SVG does.
        if (!opt.ignoreRootClip && width != null && height != null) {
            root.setClipPath(new Rect({
                shape: {x: 0, y: 0, width: width, height: height}
            }));
        }
    
        // Set width/height on group just for output the viewport size.
        return {
            root: root,
            width: width,
            height: height,
            viewBoxRect: viewBoxRect,
            viewBoxTransform: viewBoxTransform
        };
    },
    _parseNode:function (xmlNode, parentGroup) {
        let nodeName = xmlNode.nodeName.toLowerCase();
        // TODO
        // support <style>...</style> in svg, where nodeName is 'style',
        // CSS classes is defined globally wherever the style tags are declared.
        if (nodeName === 'defs') {
            // define flag
            this._isDefine = true;
        }else if (nodeName === 'text') {
            this._isText = true;
        }
    
        let el;
        if (this._isDefine) {
            let parser = defineParsers[nodeName];
            if (parser) {
                let def = parser.call(this, xmlNode);
                let id = xmlNode.getAttribute('id');
                if (id) {
                    this._defs[id] = def;
                }
            }
        }else {
            let parser = nodeParsers[nodeName];
            if (parser) {
                el = parser.call(this, xmlNode, parentGroup);
                parentGroup.add(el);
            }
        }
    
        let child = xmlNode.firstChild;
        while (child) {
            if (child.nodeType === 1) {
                this._parseNode(child, el);
            }
            // Is text
            if (child.nodeType === 3 && this._isText) {
                this._parseText(child, el);
            }
            child = child.nextSibling;
        }
    
        // Quit define
        if (nodeName === 'defs') {
            this._isDefine = false;
        }else if (nodeName === 'text') {
            this._isText = false;
        }
    },
    _parseText:function (xmlNode, parentGroup) {
        if (xmlNode.nodeType === 1) {
            let dx = xmlNode.getAttribute('dx') || 0;
            let dy = xmlNode.getAttribute('dy') || 0;
            this._textX += parseFloat(dx);
            this._textY += parseFloat(dy);
        }
    
        let text = new Text({
            style: {
                text: xmlNode.textContent,
                transformText: true
            },
            position: [this._textX || 0, this._textY || 0]
        });
    
        inheritStyle(parentGroup, text);
        parseAttributes(xmlNode, text, this._defs);
    
        let fontSize = text.style.fontSize;
        if (fontSize && fontSize < 9) {
            // PENDING
            text.style.fontSize = 9;
            text.scale = text.scale || [1, 1];
            text.scale[0] *= fontSize / 9;
            text.scale[1] *= fontSize / 9;
        }

        let rect = text.getBoundingRect();
        this._textX += rect.width;
        parentGroup.add(text);
        return text;
    }
}

let nodeParsers = {
    'g': function (xmlNode, parentGroup) {
        let g = new Group();
        inheritStyle(parentGroup, g);
        parseAttributes(xmlNode, g, this._defs);

        return g;
    },
    'rect': function (xmlNode, parentGroup) {
        let rect = new Rect();
        inheritStyle(parentGroup, rect);
        parseAttributes(xmlNode, rect, this._defs);

        rect.setShape({
            x: parseFloat(xmlNode.getAttribute('x') || 0),
            y: parseFloat(xmlNode.getAttribute('y') || 0),
            width: parseFloat(xmlNode.getAttribute('width') || 0),
            height: parseFloat(xmlNode.getAttribute('height') || 0)
        });
        return rect;
    },
    'circle': function (xmlNode, parentGroup) {
        let circle = new Circle();
        inheritStyle(parentGroup, circle);
        parseAttributes(xmlNode, circle, this._defs);

        circle.setShape({
            cx: parseFloat(xmlNode.getAttribute('cx') || 0),
            cy: parseFloat(xmlNode.getAttribute('cy') || 0),
            r: parseFloat(xmlNode.getAttribute('r') || 0)
        });

        return circle;
    },
    'line': function (xmlNode, parentGroup) {
        let line = new Line();
        inheritStyle(parentGroup, line);
        parseAttributes(xmlNode, line, this._defs);

        line.setShape({
            x1: parseFloat(xmlNode.getAttribute('x1') || 0),
            y1: parseFloat(xmlNode.getAttribute('y1') || 0),
            x2: parseFloat(xmlNode.getAttribute('x2') || 0),
            y2: parseFloat(xmlNode.getAttribute('y2') || 0)
        });

        return line;
    },
    'ellipse': function (xmlNode, parentGroup) {
        let ellipse = new Ellipse();
        inheritStyle(parentGroup, ellipse);
        parseAttributes(xmlNode, ellipse, this._defs);

        ellipse.setShape({
            cx: parseFloat(xmlNode.getAttribute('cx') || 0),
            cy: parseFloat(xmlNode.getAttribute('cy') || 0),
            rx: parseFloat(xmlNode.getAttribute('rx') || 0),
            ry: parseFloat(xmlNode.getAttribute('ry') || 0)
        });
        return ellipse;
    },
    'polygon': function (xmlNode, parentGroup) {
        let points = xmlNode.getAttribute('points');
        if (points) {
            points = parsePoints(points);
        }
        let polygon = new Polygon({
            shape: {
                points: points || []
            }
        });

        inheritStyle(parentGroup, polygon);
        parseAttributes(xmlNode, polygon, this._defs);

        return polygon;
    },
    'polyline': function (xmlNode, parentGroup) {
        let path = new Path();
        inheritStyle(parentGroup, path);
        parseAttributes(xmlNode, path, this._defs);

        let points = xmlNode.getAttribute('points');
        if (points) {
            points = parsePoints(points);
        }
        let polyline = new Polyline({
            shape: {
                points: points || []
            }
        });

        return polyline;
    },
    'image': function (xmlNode, parentGroup) {
        let img = new QImage();
        inheritStyle(parentGroup, img);
        parseAttributes(xmlNode, img, this._defs);

        img.attr({
            style:{
                image: xmlNode.getAttribute('xlink:href'),
                x: xmlNode.getAttribute('x'),
                y: xmlNode.getAttribute('y'),
                width: xmlNode.getAttribute('width'),
                height: xmlNode.getAttribute('height')
            }
        });

        return img;
    },
    'text': function (xmlNode, parentGroup) {
        let x = xmlNode.getAttribute('x') || 0;
        let y = xmlNode.getAttribute('y') || 0;
        let dx = xmlNode.getAttribute('dx') || 0;
        let dy = xmlNode.getAttribute('dy') || 0;

        this._textX = parseFloat(x) + parseFloat(dx);
        this._textY = parseFloat(y) + parseFloat(dy);

        let g = new Group();
        inheritStyle(parentGroup, g);
        parseAttributes(xmlNode, g, this._defs);

        return g;
    },
    'tspan': function (xmlNode, parentGroup) {
        let x = xmlNode.getAttribute('x');
        let y = xmlNode.getAttribute('y');
        if (x != null) {
            // new offset x
            this._textX = parseFloat(x);
        }
        if (y != null) {
            // new offset y
            this._textY = parseFloat(y);
        }
        let dx = xmlNode.getAttribute('dx') || 0;
        let dy = xmlNode.getAttribute('dy') || 0;

        let g = new Group();

        inheritStyle(parentGroup, g);
        parseAttributes(xmlNode, g, this._defs);


        this._textX += dx;
        this._textY += dy;

        return g;
    },
    'path': function (xmlNode, parentGroup) {
        // TODO svg fill rule
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-rule
        // path.style.globalCompositeOperation = 'xor';
        let d = xmlNode.getAttribute('d') || '';

        // Performance sensitive.

        let path = createFromString(d);

        inheritStyle(parentGroup, path);
        parseAttributes(xmlNode, path, this._defs);

        return path;
    }
};

let defineParsers = {

    'lineargradient': function (xmlNode) {
        let x1 = parseInt(xmlNode.getAttribute('x1') || 0, 10);
        let y1 = parseInt(xmlNode.getAttribute('y1') || 0, 10);
        let x2 = parseInt(xmlNode.getAttribute('x2') || 10, 10);
        let y2 = parseInt(xmlNode.getAttribute('y2') || 0, 10);

        let gradient = new LinearGradient(x1, y1, x2, y2);

        _parseGradientColorStops(xmlNode, gradient);

        return gradient;
    },

    'radialgradient': function (xmlNode) {

    }
};

function _parseGradientColorStops(xmlNode, gradient) {

    let stop = xmlNode.firstChild;

    while (stop) {
        if (stop.nodeType === 1) {
            let offset = stop.getAttribute('offset');
            if (offset.indexOf('%') > 0) {  // percentage
                offset = parseInt(offset, 10) / 100;
            }
            else if (offset) {    // number from 0 to 1
                offset = parseFloat(offset);
            }
            else {
                offset = 0;
            }

            let stopColor = stop.getAttribute('stop-color') || '#000000';

            gradient.addColorStop(offset, stopColor);
        }
        stop = stop.nextSibling;
    }
}

function inheritStyle(parent, child) {
    if (parent && parent.__inheritedStyle) {
        if (!child.__inheritedStyle) {
            child.__inheritedStyle = {};
        }
        defaults(child.__inheritedStyle, parent.__inheritedStyle);
    }
}

function parsePoints(pointsString) {
    let list = trim(pointsString).split(DILIMITER_REG);
    let points = [];

    for (let i = 0; i < list.length; i += 2) {
        let x = parseFloat(list[i]);
        let y = parseFloat(list[i + 1]);
        points.push([x, y]);
    }
    return points;
}

let attributesMap = {
    'fill': 'fill',
    'stroke': 'stroke',
    'stroke-width': 'lineWidth',
    'opacity': 'opacity',
    'fill-opacity': 'fillOpacity',
    'stroke-opacity': 'strokeOpacity',
    'stroke-dasharray': 'lineDash',
    'stroke-dashoffset': 'lineDashOffset',
    'stroke-linecap': 'lineCap',
    'stroke-linejoin': 'lineJoin',
    'stroke-miterlimit': 'miterLimit',
    'font-family': 'fontFamily',
    'font-size': 'fontSize',
    'font-style': 'fontStyle',
    'font-weight': 'fontWeight',
    'text-align': 'textAlign',
    'alignment-baseline': 'textBaseline'
};

function parseAttributes(xmlNode, el, defs, onlyInlineStyle) {
    let topoStyle = el.__inheritedStyle || {};
    let isTextEl = el.type === 'text';

    // TODO Shadow
    if (xmlNode.nodeType === 1) {
        parseTransformAttribute(xmlNode, el);

        extend(topoStyle, parseStyleAttribute(xmlNode));

        if (!onlyInlineStyle) {
            for (let svgAttrName in attributesMap) {
                if (attributesMap.hasOwnProperty(svgAttrName)) {
                    let attrValue = xmlNode.getAttribute(svgAttrName);
                    if (attrValue != null) {
                        topoStyle[attributesMap[svgAttrName]] = attrValue;
                    }
                }
            }
        }
    }

    let elFillProp = isTextEl ? 'textFill' : 'fill';
    let elStrokeProp = isTextEl ? 'textStroke' : 'stroke';

    el.style = el.style || new Style();
    let elStyle = el.style;

    topoStyle.fill != null && elStyle.set(elFillProp, getPaint(topoStyle.fill, defs));
    topoStyle.stroke != null && elStyle.set(elStrokeProp, getPaint(topoStyle.stroke, defs));

    each([
        'lineWidth', 'opacity', 'fillOpacity', 'strokeOpacity', 'miterLimit', 'fontSize'
    ], function (propName) {
        let elPropName = (propName === 'lineWidth' && isTextEl) ? 'textStrokeWidth' : propName;
        topoStyle[propName] != null && elStyle.set(elPropName, parseFloat(topoStyle[propName]));
    });

    if (!topoStyle.textBaseline || topoStyle.textBaseline === 'auto') {
        topoStyle.textBaseline = 'alphabetic';
    }
    if (topoStyle.textBaseline === 'alphabetic') {
        topoStyle.textBaseline = 'bottom';
    }
    if (topoStyle.textAlign === 'start') {
        topoStyle.textAlign = 'left';
    }
    if (topoStyle.textAlign === 'end') {
        topoStyle.textAlign = 'right';
    }

    each(['lineDashOffset', 'lineCap', 'lineJoin',
        'fontWeight', 'fontFamily', 'fontStyle', 'textAlign', 'textBaseline'
    ], function (propName) {
        topoStyle[propName] != null && elStyle.set(propName, topoStyle[propName]);
    });

    if (topoStyle.lineDash) {
        el.style.lineDash = trim(topoStyle.lineDash).split(DILIMITER_REG);
    }

    if (elStyle[elStrokeProp] && elStyle[elStrokeProp] !== 'none') {
        // enable stroke
        el[elStrokeProp] = true;
    }

    el.__inheritedStyle = topoStyle;
}

let urlRegex = /url\(\s*#(.*?)\)/;
function getPaint(str, defs) {
    // if (str === 'none') {
    //     return;
    // }
    let urlMatch = defs && str && str.match(urlRegex);
    if (urlMatch) {
        let url = trim(urlMatch[1]);
        let def = defs[url];
        return def;
    }
    return str;
}

let transformRegex = /(translate|scale|rotate|skewX|skewY|matrix)\(([\-\s0-9\.e,]*)\)/g;

function parseTransformAttribute(xmlNode, node) {
    let transform = xmlNode.getAttribute('transform');
    if (transform) {
        transform = transform.replace(/,/g, ' ');
        let m = null;
        let transformOps = [];
        transform.replace(transformRegex, function (str, type, value) {
            transformOps.push(type, value);
        });

        let px = 0;
        let py = 0;
        let sx = 0;
        let sy = 0;
        let rotation = 0;
        let skewX = 0;
        let skewY = 0;

        for (let i = transformOps.length - 1; i > 0; i -= 2) {
            let value = transformOps[i];
            let type = transformOps[i - 1];
            m = m || matrixUtil.create();
            switch (type) {
                case 'translate':
                    value = trim(value).split(DILIMITER_REG);
                    px=value[0]+parseFloat(value[0]);
                    py=value[1]+parseFloat(value[1] || 0);
                    m=matrixUtil.translate(m,[px,py]);
                    break;
                case 'scale':
                    value = trim(value).split(DILIMITER_REG);
                    sx=parseFloat(value[0]);
                    sy=parseFloat(value[1] || value[0]);
                    m=matrixUtil.scale(m,[sx,sy]);
                    break;
                case 'rotate':
                    value = trim(value).split(DILIMITER_REG);
                    rotation=parseFloat(value[0]);
                    m=matrixUtil.rotate(m,rotation);
                    break;
                case 'skew':
                    value = trim(value).split(DILIMITER_REG);
                    skewX=parseFloat(value[0]);
                    skewY=parseFloat(value[1] || value[0]);
                    m=matrixUtil.scale(m,[skewX,skewY]);
                    break;
                case 'matrix':
                    value = trim(value).split(DILIMITER_REG);
                    m[0] = parseFloat(value[0]);
                    m[1] = parseFloat(value[1]);
                    m[2] = parseFloat(value[2]);
                    m[3] = parseFloat(value[3]);
                    m[4] = parseFloat(value[4]);
                    m[5] = parseFloat(value[5]);
                    break;
            }
            node.transform=m;
        }
    }
}

// Value may contain space.
let styleRegex = /([^\s:;]+)\s*:\s*([^:;]+)/g;
function parseStyleAttribute(xmlNode) {
    let style = xmlNode.getAttribute('style');
    let result = {};

    if (!style) {
        return result;
    }

    let styleList = {};
    styleRegex.lastIndex = 0;
    let styleRegResult;
    while ((styleRegResult = styleRegex.exec(style)) != null) {
        styleList[styleRegResult[1]] = styleRegResult[2];
    }

    for (let svgAttrName in attributesMap) {
        if (attributesMap.hasOwnProperty(svgAttrName) && styleList[svgAttrName] != null) {
            result[attributesMap[svgAttrName]] = styleList[svgAttrName];
        }
    }

    return result;
}

/**
 * @param {Array<Number>} viewBoxRect
 * @param {Number} width
 * @param {Number} height
 * @return {Object} {scale, position}
 */
export function makeViewBoxTransform(viewBoxRect, width, height) {
    let scaleX = width / viewBoxRect.width;
    let scaleY = height / viewBoxRect.height;
    let scale = mathMin(scaleX, scaleY);
    // preserveAspectRatio 'xMidYMid'
    let viewBoxScale = [scale, scale];
    let viewBoxPosition = [
        -(viewBoxRect.x + viewBoxRect.width / 2) * scale + width / 2,
        -(viewBoxRect.y + viewBoxRect.height / 2) * scale + height / 2
    ];

    return {
        scale: viewBoxScale,
        position: viewBoxPosition
    };
}

/**
 * @static
 * @method parseSVG
 * 
 * Parse SVG DOM to FishTopo specific interfaces.
 * 
 * 把 SVG DOM 标签解析成 FishTopo 所定义的接口。
 * 
 * @param {String|XMLElement} xml
 * @param {Object} [opt]
 * @param {Number} [opt.width] Default width if svg width not specified or is a percent value.
 * @param {Number} [opt.height] Default height if svg height not specified or is a percent value.
 * @param {Boolean} [opt.ignoreViewBox]
 * @param {Boolean} [opt.ignoreRootClip]
 * @return {Object} result:
 * {
 *     root: Group, The root of the the result tree of fishTopo shapes,
 *     width: number, the viewport width of the SVG,
 *     height: number, the viewport height of the SVG,
 *     viewBoxRect: {x, y, width, height}, the declared viewBox rect of the SVG, if exists,
 *     viewBoxTransform: the {scale, position} calculated by viewBox and viewport, is exists.
 * }
 */
export function parseSVG(xml, opt) {
    let parser = new SVGParser();
    return parser.parse(xml, opt);
}