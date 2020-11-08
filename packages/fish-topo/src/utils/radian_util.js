import {PI2} from './constants';

export function normalizeRadian(angle) {
    angle %= PI2;
    if (angle < 0) {
        angle += PI2;
    }
    return angle;
}