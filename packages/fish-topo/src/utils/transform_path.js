import {applyTransform as v2ApplyTransform} from './vector_util';
import {mathSqrt,mathAtan2} from './constants';
import PathProxy from '../graphic/PathProxy';

var CMD = PathProxy.CMD;
var points = [[], [], []];

export default function (path, m) {
    var data = path.data;
    var cmd;
    var nPoint;
    var i;
    var j;
    var k;
    var p;
    var x;
    var y;
    var sx;
    var sy;
    var angle;

    var M = CMD.M;
    var C = CMD.C;
    var L = CMD.L;
    var R = CMD.R;
    var A = CMD.A;
    var Q = CMD.Q;

    for (i = 0, j = 0; i < data.length;) {
        cmd = data[i++];
        j = i;
        nPoint = 0;

        switch (cmd) {
            case M:
                nPoint = 1;
                break;
            case L:
                nPoint = 1;
                break;
            case C:
                nPoint = 3;
                break;
            case Q:
                nPoint = 2;
                break;
            case A:
                x = m[4];
                y = m[5];
                sx = mathSqrt(m[0] * m[0] + m[1] * m[1]);
                sy = mathSqrt(m[2] * m[2] + m[3] * m[3]);
                angle = mathAtan2(-m[1] / sy, m[0] / sx);
                // cx
                data[i] *= sx;
                data[i++] += x;
                // cy
                data[i] *= sy;
                data[i++] += y;
                // Scale rx and ry
                // FIXME Assume psi is 0 here
                data[i++] *= sx;
                data[i++] *= sy;

                // Start angle
                data[i++] += angle;
                // end angle
                data[i++] += angle;
                // FIXME psi
                i += 2;
                j = i;
                break;
            case R:
                // x0, y0
                p[0] = data[i++];
                p[1] = data[i++];
                v2ApplyTransform(p, p, m);
                data[j++] = p[0];
                data[j++] = p[1];
                // x1, y1
                p[0] += data[i++];
                p[1] += data[i++];
                v2ApplyTransform(p, p, m);
                data[j++] = p[0];
                data[j++] = p[1];
        }

        for (k = 0; k < nPoint; k++) {
            p = points[k];
            p[0] = data[i++];
            p[1] = data[i++];

            v2ApplyTransform(p, p, m);
            // Write back
            data[j++] = p[0];
            data[j++] = p[1];
        }
    }
}
