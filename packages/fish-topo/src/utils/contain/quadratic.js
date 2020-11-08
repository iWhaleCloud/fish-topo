import {quadraticProjectPoint} from '../curve_util';

/**
 * 二次贝塞尔曲线描边包含判断
 * @param  {Number}  x0
 * @param  {Number}  y0
 * @param  {Number}  x1
 * @param  {Number}  y1
 * @param  {Number}  x2
 * @param  {Number}  y2
 * @param  {Number}  lineWidth
 * @param  {Number}  x
 * @param  {Number}  y
 * @return {Boolean}
 */
export function containStroke(x0, y0, x1, y1, x2, y2, lineWidth, x, y) {
    if (lineWidth === 0) {
        return false;
    }
    let _l = lineWidth;
    // Quick reject
    if (
        (y > y0 + _l && y > y1 + _l && y > y2 + _l)
        || (y < y0 - _l && y < y1 - _l && y < y2 - _l)
        || (x > x0 + _l && x > x1 + _l && x > x2 + _l)
        || (x < x0 - _l && x < x1 - _l && x < x2 - _l)
    ) {
        return false;
    }
    let d = quadraticProjectPoint(
        x0, y0, x1, y1, x2, y2,
        x, y, null
    );
    return d <= _l / 2;
}
