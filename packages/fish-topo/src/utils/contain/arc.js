import {normalizeRadian} from '../radian_util';
import {PI2,mathSqrt,mathAbs,mathAtan2} from '../constants';

/**
 * 圆弧描边包含判断
 * @param  {Number}  cx
 * @param  {Number}  cy
 * @param  {Number}  r
 * @param  {Number}  startAngle
 * @param  {Number}  endAngle
 * @param  {Boolean}  anticlockwise
 * @param  {Number} lineWidth
 * @param  {Number}  x
 * @param  {Number}  y
 * @return {Boolean}
 */
export function containStroke(
    cx, cy, r, startAngle, endAngle, anticlockwise,
    lineWidth, x, y
) {

    if (lineWidth === 0) {
        return false;
    }
    let _l = lineWidth;

    x -= cx;
    y -= cy;
    let d = mathSqrt(x * x + y * y);

    if ((d - _l > r) || (d + _l < r)) {
        return false;
    }
    if (mathAbs(startAngle - endAngle) % PI2 < 1e-4) {
        // Is a circle
        return true;
    }
    if (anticlockwise) {
        let tmp = startAngle;
        startAngle = normalizeRadian(endAngle);
        endAngle = normalizeRadian(tmp);
    }
    else {
        startAngle = normalizeRadian(startAngle);
        endAngle = normalizeRadian(endAngle);
    }
    if (startAngle > endAngle) {
        endAngle += PI2;
    }

    let angle = mathAtan2(y, x);
    if (angle < 0) {
        angle += PI2;
    }
    return (angle >= startAngle && angle <= endAngle)
        || (angle + PI2 >= startAngle && angle + PI2 <= endAngle);
}