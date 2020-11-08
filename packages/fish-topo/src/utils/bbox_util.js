/**
 * @author Yi Shen(https://github.com/pissang)
 */
import * as vectorUtil from './vector_util';
import * as curve from './curve_util';
import {PI2,mathCos,mathSin,PI,mathMin,mathMax,mathAbs} from './constants';

var start = vectorUtil.create();
var end = vectorUtil.create();
var extremity = vectorUtil.create();

/**
 * 从顶点数组中计算出最小包围盒，写入`min`和`max`中
 * @param {Array<Object>} points 顶点数组
 * @param {Number} min
 * @param {Number} max
 */
export function fromPoints(points, min, max) {
    if (points.length === 0) {
        return;
    }
    var p = points[0];
    var left = p[0];
    var right = p[0];
    var top = p[1];
    var bottom = p[1];
    var i;

    for (i = 1; i < points.length; i++) {
        p = points[i];
        left = mathMin(left, p[0]);
        right = mathMax(right, p[0]);
        top = mathMin(top, p[1]);
        bottom = mathMax(bottom, p[1]);
    }

    min[0] = left;
    min[1] = top;
    max[0] = right;
    max[1] = bottom;
}

/**
 * @param {Number} x0
 * @param {Number} y0
 * @param {Number} x1
 * @param {Number} y1
 * @param {Array<Number>} min
 * @param {Array<Number>} max
 */
export function fromLine(x0, y0, x1, y1, min, max) {
    min[0] = mathMin(x0, x1);
    min[1] = mathMin(y0, y1);
    max[0] = mathMax(x0, x1);
    max[1] = mathMax(y0, y1);
}

var xDim = [];
var yDim = [];
/**
 * 从三阶贝塞尔曲线(p0, p1, p2, p3)中计算出最小包围盒，写入`min`和`max`中
 * @param {Number} x0
 * @param {Number} y0
 * @param {Number} x1
 * @param {Number} y1
 * @param {Number} x2
 * @param {Number} y2
 * @param {Number} x3
 * @param {Number} y3
 * @param {Array<Number>} min
 * @param {Array<Number>} max
 */
export function fromCubic(
    x0, y0, x1, y1, x2, y2, x3, y3, min, max
) {
    var cubicExtrema = curve.cubicExtrema;
    var cubicAt = curve.cubicAt;
    var i;
    var n = cubicExtrema(x0, x1, x2, x3, xDim);
    min[0] = Infinity;
    min[1] = Infinity;
    max[0] = -Infinity;
    max[1] = -Infinity;

    for (i = 0; i < n; i++) {
        var x = cubicAt(x0, x1, x2, x3, xDim[i]);
        min[0] = mathMin(x, min[0]);
        max[0] = mathMax(x, max[0]);
    }
    n = cubicExtrema(y0, y1, y2, y3, yDim);
    for (i = 0; i < n; i++) {
        var y = cubicAt(y0, y1, y2, y3, yDim[i]);
        min[1] = mathMin(y, min[1]);
        max[1] = mathMax(y, max[1]);
    }

    min[0] = mathMin(x0, min[0]);
    max[0] = mathMax(x0, max[0]);
    min[0] = mathMin(x3, min[0]);
    max[0] = mathMax(x3, max[0]);

    min[1] = mathMin(y0, min[1]);
    max[1] = mathMax(y0, max[1]);
    min[1] = mathMin(y3, min[1]);
    max[1] = mathMax(y3, max[1]);
}

/**
 * 从二阶贝塞尔曲线(p0, p1, p2)中计算出最小包围盒，写入`min`和`max`中
 * @param {Number} x0
 * @param {Number} y0
 * @param {Number} x1
 * @param {Number} y1
 * @param {Number} x2
 * @param {Number} y2
 * @param {Array<Number>} min
 * @param {Array<Number>} max
 */
export function fromQuadratic(x0, y0, x1, y1, x2, y2, min, max) {
    var quadraticExtremum = curve.quadraticExtremum;
    var quadraticAt = curve.quadraticAt;
    // Find extremities, where derivative in x dim or y dim is zero
    var tx =
        mathMax(
            mathMin(quadraticExtremum(x0, x1, x2), 1), 0
        );
    var ty =
        mathMax(
            mathMin(quadraticExtremum(y0, y1, y2), 1), 0
        );

    var x = quadraticAt(x0, x1, x2, tx);
    var y = quadraticAt(y0, y1, y2, ty);

    min[0] = mathMin(x0, x2, x);
    min[1] = mathMin(y0, y2, y);
    max[0] = mathMax(x0, x2, x);
    max[1] = mathMax(y0, y2, y);
}

/**
 * 从圆弧中计算出最小包围盒，写入`min`和`max`中
 * @method
 * @param {Number} x
 * @param {Number} y
 * @param {Number} rx
 * @param {Number} ry
 * @param {Number} startAngle
 * @param {Number} endAngle
 * @param {Number} anticlockwise
 * @param {Array<Number>} min
 * @param {Array<Number>} max
 */
export function fromArc(
    x, y, rx, ry, startAngle, endAngle, anticlockwise, min, max
) {
    var vec2Min = vectorUtil.min;
    var vec2Max = vectorUtil.max;

    var diff = mathAbs(startAngle - endAngle);


    if (diff % PI2 < 1e-4 && diff > 1e-4) {
        // Is a circle
        min[0] = x - rx;
        min[1] = y - ry;
        max[0] = x + rx;
        max[1] = y + ry;
        return;
    }

    start[0] = mathCos(startAngle) * rx + x;
    start[1] = mathSin(startAngle) * ry + y;

    end[0] = mathCos(endAngle) * rx + x;
    end[1] = mathSin(endAngle) * ry + y;

    vec2Min(min, start, end);
    vec2Max(max, start, end);

    // Thresh to [0, PI * 2]
    startAngle = startAngle % (PI2);
    if (startAngle < 0) {
        startAngle = startAngle + PI2;
    }
    endAngle = endAngle % (PI2);
    if (endAngle < 0) {
        endAngle = endAngle + PI2;
    }

    if (startAngle > endAngle && !anticlockwise) {
        endAngle += PI2;
    }
    else if (startAngle < endAngle && anticlockwise) {
        startAngle += PI2;
    }
    if (anticlockwise) {
        var tmp = endAngle;
        endAngle = startAngle;
        startAngle = tmp;
    }

    // var number = 0;
    // var step = (anticlockwise ? -PI : PI) / 2;
    for (var angle = 0; angle < endAngle; angle += PI / 2) {
        if (angle > startAngle) {
            extremity[0] = mathCos(angle) * rx + x;
            extremity[1] = mathSin(angle) * ry + y;

            vec2Min(min, extremity, min);
            vec2Max(max, extremity, max);
        }
    }
}
