import {mathAsin,mathCos,mathSin,mathPow,mathSqrt,PI} from '../utils/constants';

/**
 * This implmentation is from https://github.com/sole/tween.js/blob/master/src/Tween.js .
 * 
 * 
 * 缓动代码来自 https://github.com/sole/tween.js/blob/master/src/Tween.js 。
 * 
 * @see http://sole.github.io/tween.js/examples/03_graphs.html
 */
let easing = {
    /**
     * @param {Number} k
     * @return {Number}
     */
    linear: function (k) {
        return k;
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    quadraticIn: function (k) {
        return k * k;
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    quadraticOut: function (k) {
        return k * (2 - k);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    quadraticInOut: function (k) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k;
        }
        return -0.5 * (--k * (k - 2) - 1);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    cubicIn: function (k) {
        return k * k * k;
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    cubicOut: function (k) {
        return --k * k * k + 1;
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    cubicInOut: function (k) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k * k;
        }
        return 0.5 * ((k -= 2) * k * k + 2);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    quarticIn: function (k) {
        return k * k * k * k;
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    quarticOut: function (k) {
        return 1 - (--k * k * k * k);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    quarticInOut: function (k) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k * k * k;
        }
        return -0.5 * ((k -= 2) * k * k * k - 2);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    quinticIn: function (k) {
        return k * k * k * k * k;
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    quinticOut: function (k) {
        return --k * k * k * k * k + 1;
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    quinticInOut: function (k) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k * k * k * k;
        }
        return 0.5 * ((k -= 2) * k * k * k * k + 2);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    sinusoidalIn: function (k) {
        return 1 - mathCos(k * PI / 2);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    sinusoidalOut: function (k) {
        return mathSin(k * PI / 2);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    sinusoidalInOut: function (k) {
        return 0.5 * (1 - mathCos(PI * k));
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    exponentialIn: function (k) {
        return k === 0 ? 0 : mathPow(1024, k - 1);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    exponentialOut: function (k) {
        return k === 1 ? 1 : 1 - mathPow(2, -10 * k);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    exponentialInOut: function (k) {
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if ((k *= 2) < 1) {
            return 0.5 * mathPow(1024, k - 1);
        }
        return 0.5 * (-mathPow(2, -10 * (k - 1)) + 2);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    circularIn: function (k) {
        return 1 - mathSqrt(1 - k * k);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    circularOut: function (k) {
        return mathSqrt(1 - (--k * k));
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    circularInOut: function (k) {
        if ((k *= 2) < 1) {
            return -0.5 * (mathSqrt(1 - k * k) - 1);
        }
        return 0.5 * (mathSqrt(1 - (k -= 2) * k) + 1);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    elasticIn: function (k) {
        let s;
        let a = 0.1;
        let p = 0.4;
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        }
        else {
            s = p * mathAsin(1 / a) / (2 * PI);
        }
        return -(a * mathPow(2, 10 * (k -= 1))
                    * mathSin((k - s) * (2 * PI) / p));
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    elasticOut: function (k) {
        let s;
        let a = 0.1;
        let p = 0.4;
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        }
        else {
            s = p * mathAsin(1 / a) / (2 * PI);
        }
        return (a * mathPow(2, -10 * k)
                    * mathSin((k - s) * (2 * PI) / p) + 1);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    elasticInOut: function (k) {
        let s;
        let a = 0.1;
        let p = 0.4;
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        }
        else {
            s = p * mathAsin(1 / a) / (2 * PI);
        }
        if ((k *= 2) < 1) {
            return -0.5 * (a * mathPow(2, 10 * (k -= 1))
                * mathSin((k - s) * (2 * PI) / p));
        }
        return a * mathPow(2, -10 * (k -= 1))
                * mathSin((k - s) * (2 * PI) / p) * 0.5 + 1;

    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    backIn: function (k) {
        let s = 1.70158;
        return k * k * ((s + 1) * k - s);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    backOut: function (k) {
        let s = 1.70158;
        return --k * k * ((s + 1) * k + s) + 1;
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    backInOut: function (k) {
        let s = 1.70158 * 1.525;
        if ((k *= 2) < 1) {
            return 0.5 * (k * k * ((s + 1) * k - s));
        }
        return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    bounceIn: function (k) {
        return 1 - easing.bounceOut(1 - k);
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    bounceOut: function (k) {
        if (k < (1 / 2.75)) {
            return 7.5625 * k * k;
        }
        else if (k < (2 / 2.75)) {
            return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
        }
        else if (k < (2.5 / 2.75)) {
            return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
        }
        else {
            return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
        }
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    bounceInOut: function (k) {
        if (k < 0.5) {
            return easing.bounceIn(k * 2) * 0.5;
        }
        return easing.bounceOut(k * 2 - 1) * 0.5 + 0.5;
    }
};

export default easing;