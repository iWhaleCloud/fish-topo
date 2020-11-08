import {distance as v2Distance} from './vector_util';
import {mathFloor} from './constants';
/**
 * Catmull-Rom spline 插值折线
 * @author pissang (https://www.github.com/pissang)
 *         Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *         errorrik (errorrik@gmail.com)
 */

/**
 * @inner
 */
function interpolate(p0, p1, p2, p3, t, t2, t3) {
    let v0 = (p2 - p0) * 0.5;
    let v1 = (p3 - p1) * 0.5;
    return (2 * (p1 - p2) + v0 + v1) * t3
            + (-3 * (p1 - p2) - 2 * v0 - v1) * t2
            + v0 * t + p1;
}

/**
 * @alias smoothSpline
 * @param {Array} points 线段顶点数组
 * @param {Boolean} isLoop
 * @return {Array}
 */
export default function (points, isLoop) {
    let len = points.length;
    let ret = [];
    let i = 0; 

    let distance = 0;
    for (i = 1; i < len; i++) {
        distance += v2Distance(points[i - 1], points[i]);
    }

    let segs = distance / 2;
    segs = segs < len ? len : segs;
    for (i = 0; i < segs; i++) {
        let pos = i / (segs - 1) * (isLoop ? len : len - 1);
        let idx = mathFloor(pos);

        let w = pos - idx;

        let p0;
        let p1 = points[idx % len];
        let p2;
        let p3;
        if (!isLoop) {
            p0 = points[idx === 0 ? idx : idx - 1];
            p2 = points[idx > len - 2 ? len - 1 : idx + 1];
            p3 = points[idx > len - 3 ? len - 1 : idx + 2];
        }
        else {
            p0 = points[(idx - 1 + len) % len];
            p2 = points[(idx + 1) % len];
            p3 = points[(idx + 2) % len];
        }

        let w2 = w * w;
        let w3 = w * w2;

        ret.push([
            interpolate(p0[0], p1[0], p2[0], p3[0], w, w2, w3),
            interpolate(p0[1], p1[1], p2[1], p3[1], w, w2, w3)
        ]);
    }
    return ret;
}