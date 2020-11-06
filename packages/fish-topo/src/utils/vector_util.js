import {mathSqrt,mathMin,mathMax} from './constants';

let ArrayCtor = typeof Float32Array === 'undefined'
    ? Array
    : Float32Array;

/**
 * 创建一个向量
 * @param {Number} [x=0]
 * @param {Number} [y=0]
 * @return {Vector2}
 */
export function create(x, y) {
    let out = new ArrayCtor(2);
    if (x == null) {
        x = 0;
    }
    if (y == null) {
        y = 0;
    }
    out[0] = x;
    out[1] = y;
    return out;
}

/**
 * 复制向量数据
 * @param {Vector2} out
 * @param {Vector2} v
 * @return {Vector2}
 */
export function copy(out, v) {
    out[0] = v[0];
    out[1] = v[1];
    return out;
}

/**
 * 克隆一个向量
 * @param {Vector2} v
 * @return {Vector2}
 */
export function clone(v) {
    let out = new ArrayCtor(2);
    out[0] = v[0];
    out[1] = v[1];
    return out;
}

/**
 * 设置向量的两个项
 * @param {Vector2} out
 * @param {Number} a
 * @param {Number} b
 * @return {Vector2} 结果
 */
export function set(out, a, b) {
    out[0] = a;
    out[1] = b;
    return out;
}

/**
 * 向量相加
 * @param {Vector2} out
 * @param {Vector2} v1
 * @param {Vector2} v2
 */
export function add(out, v1, v2) {
    out[0] = v1[0] + v2[0];
    out[1] = v1[1] + v2[1];
    return out;
}

/**
 * 向量缩放后相加
 * @param {Vector2} out
 * @param {Vector2} v1
 * @param {Vector2} v2
 * @param {Number} a
 */
export function scaleAndAdd(out, v1, v2, a) {
    out[0] = v1[0] + v2[0] * a;
    out[1] = v1[1] + v2[1] * a;
    return out;
}

/**
 * 向量相减
 * @param {Vector2} out
 * @param {Vector2} v1
 * @param {Vector2} v2
 */
export function sub(out, v1, v2) {
    out[0] = v1[0] - v2[0];
    out[1] = v1[1] - v2[1];
    return out;
}

/**
 * 向量长度
 * @param {Vector2} v
 * @return {Number}
 */
export function len(v) {
    return mathSqrt(lenSquare(v));
}
export let length = len; // jshint ignore:line

/**
 * 向量长度平方
 * @param {Vector2} v
 * @return {Number}
 */
export function lenSquare(v) {
    return v[0] * v[0] + v[1] * v[1];
}
export let lengthSquare = lenSquare;

/**
 * 向量乘法
 * @param {Vector2} out
 * @param {Vector2} v1
 * @param {Vector2} v2
 */
export function mul(out, v1, v2) {
    out[0] = v1[0] * v2[0];
    out[1] = v1[1] * v2[1];
    return out;
}

/**
 * 向量除法
 * @param {Vector2} out
 * @param {Vector2} v1
 * @param {Vector2} v2
 */
export function div(out, v1, v2) {
    out[0] = v1[0] / v2[0];
    out[1] = v1[1] / v2[1];
    return out;
}

/**
 * 向量点乘
 * @param {Vector2} v1
 * @param {Vector2} v2
 * @return {Number}
 */
export function dot(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1];
}

/**
 * 向量缩放
 * @param {Vector2} out
 * @param {Vector2} v
 * @param {Number} s
 */
export function scale(out, v, s) {
    out[0] = v[0] * s;
    out[1] = v[1] * s;
    return out;
}

/**
 * 向量归一化
 * @param {Vector2} out
 * @param {Vector2} v
 */
export function normalize(out, v) {
    let d = len(v);
    if (d === 0) {
        out[0] = 0;
        out[1] = 0;
    }
    else {
        out[0] = v[0] / d;
        out[1] = v[1] / d;
    }
    return out;
}

/**
 * 计算向量间距离
 * @param {Vector2} v1
 * @param {Vector2} v2
 * @return {Number}
 */
export function distance(v1, v2) {
    return mathSqrt(
        (v1[0] - v2[0]) * (v1[0] - v2[0])
        + (v1[1] - v2[1]) * (v1[1] - v2[1])
    );
}
export let dist = distance;

export function center(v1, v2) {
    return [
        (v1[0]+v2[0])/2,
        (v1[1]+v2[1])/2
    ];
}

/**
 * 向量距离平方
 * @param {Vector2} v1
 * @param {Vector2} v2
 * @return {Number}
 */
export function distanceSquare(v1, v2) {
    return (v1[0] - v2[0]) * (v1[0] - v2[0])
        + (v1[1] - v2[1]) * (v1[1] - v2[1]);
}
export let distSquare = distanceSquare;

/**
 * 求负向量
 * @param {Vector2} out
 * @param {Vector2} v
 */
export function negate(out, v) {
    out[0] = -v[0];
    out[1] = -v[1];
    return out;
}

/**
 * 插值两个点
 * @param {Vector2} out
 * @param {Vector2} v1
 * @param {Vector2} v2
 * @param {Number} t
 */
export function lerp(out, v1, v2, t) {
    out[0] = v1[0] + t * (v2[0] - v1[0]);
    out[1] = v1[1] + t * (v2[1] - v1[1]);
    return out;
}

/**
 * 矩阵左乘向量
 * @param {Vector2} out
 * @param {Vector2} v
 * @param {Vector2} m
 */
export function applyTransform(out, v, m) {
    let x = v[0];
    let y = v[1];
    out[0] = m[0] * x + m[2] * y + m[4];
    out[1] = m[1] * x + m[3] * y + m[5];
    return out;
}

/**
 * 求两个向量最小值
 * @param  {Vector2} out
 * @param  {Vector2} v1
 * @param  {Vector2} v2
 */
export function min(out, v1, v2) {
    out[0] = mathMin(v1[0], v2[0]);
    out[1] = mathMin(v1[1], v2[1]);
    return out;
}

/**
 * 求两个向量最大值
 * @param  {Vector2} out
 * @param  {Vector2} v1
 * @param  {Vector2} v2
 */
export function max(out, v1, v2) {
    out[0] = mathMax(v1[0], v2[0]);
    out[1] = mathMax(v1[1], v2[1]);
    return out;
}

/**
 * |p1 p2| 叉乘 |p1 p|
 * @param {*} p1 
 * @param {*} p2 
 * @param {*} p 
 */
export function multiCross(p1,p2,p){
    return (p2[0] - p1[0]) * (p[1] - p1[1]) - (p[0] - p1[0]) * (p2[1] - p1[1]);
}

/**
 * p 点是否位于 p1/p2/p3/p4 围成的矩形内部
 * @param {*} p1 
 * @param {*} p2 
 * @param {*} p3 
 * @param {*} p4 
 * @param {*} p 
 */
export function isInsideRect(p1,p2,p3,p4,p){
    return (multiCross(p1, p2, p) * multiCross(p3, p4, p) >= 0) && (multiCross(p2, p3, p) * multiCross(p4, p1, p) >= 0);
}