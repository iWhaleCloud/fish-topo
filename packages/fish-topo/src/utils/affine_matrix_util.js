import {mathSin,mathCos,mathSqrt,mathAtan, mathAsin} from './constants';

/**
 * @class core.utils.affine_matrix_util
 * 
 * 矩阵操作类，方便进行仿射变换运算。 Canvas transform 是二维仿射变换，映射到三维线性变换进行运算，
 * 此工具类为了编码方便，运算过程中省略第三行 [0,0,1]，与 Transformations 接口定义的结构一致。
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Transformations
 * @exports fishTopo/utils/matrix
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

let ArrayConstructor = typeof Float32Array === 'undefined'
    ? Array
    : Float32Array;

/**
 * @method create
 * Create a identity matrix.
 * @return {Float32Array|Array.<Number>}
 */
export function create() {
    return identity(new ArrayConstructor(6));
}

/**
 * @method identity
 * 设置矩阵为单位矩阵
 * @param {Float32Array|Array.<Number>} out
 */
export function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
}

/**
 * @method copy
 * 复制矩阵
 * @param {Float32Array|Array.<Number>} out
 * @param {Float32Array|Array.<Number>} m
 */
export function copy(out, m) {
    out[0] = m[0];
    out[1] = m[1];
    out[2] = m[2];
    out[3] = m[3];
    out[4] = m[4];
    out[5] = m[5];
    return out;
}

/**
 * @method invert
 * 求逆矩阵
 * @param {Float32Array|Array.<Number>} out
 * @param {Float32Array|Array.<Number>} a
 */
export function invert(out, a) {
    let aa = a[0];
    let ac = a[2];
    let atx = a[4];
    let ab = a[1];
    let ad = a[3];
    let aty = a[5];

    let det = aa * ad - ab * ac;
    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = ad * det;
    out[1] = -ab * det;
    out[2] = -ac * det;
    out[3] = aa * det;
    out[4] = (ac * aty - ad * atx) * det;
    out[5] = (ab * atx - aa * aty) * det;
    return out;
}

/**
 * @method clone
 * Clone a new matrix.
 * @param {Float32Array|Array.<Number>} a
 */
export function clone(a) {
    let b = create();
    copy(b, a);
    return b;
}

/**
 * @method mul
 * m1 左乘 m2，Context.transform 定义的实际上是一个 3×3 的方阵，所以这里一定可以相乘。
 * @param {Float32Array|Array.<Number>} m1
 * @param {Float32Array|Array.<Number>} m2
 */
export function mul(m1, m2) {
    let out0 = m1[0] * m2[0] + m1[2] * m2[1];
    let out1 = m1[1] * m2[0] + m1[3] * m2[1];
    let out2 = m1[0] * m2[2] + m1[2] * m2[3];
    let out3 = m1[1] * m2[2] + m1[3] * m2[3];
    let out4 = m1[0] * m2[4] + m1[2] * m2[5] + m1[4];
    let out5 = m1[1] * m2[4] + m1[3] * m2[5] + m1[5];
    return [out0,out1,out2,out3,out4,out5];
}

/**
 * @method translate
 * 平移变换
 * @param {Float32Array|Array.<Number>} a
 * @param {Float32Array|Array.<Number>} v
 */
export function translate(a, v) {
    return mul([1,0,0,1,v[0],v[1]],a);
}

/**
 * @method rotate
 * 旋转变换
 * @param {Float32Array|Array.<Number>} a
 * @param {Number} rad
 */
export function rotate(a, rad) {
    let sinx = mathSin(rad);
    let cosx = mathCos(rad);
    return mul([cosx,-sinx,sinx,cosx,0,0],a);
}

/**
 * @method scale
 * 缩放变换
 * @param {Float32Array|Array.<Number>} a
 * @param {Float32Array|Array.<Number>} v
 */
export function scale(a, v) {
    let vx = v[0];
    let vy = v[1];
    return mul([vx,0,0,vy,0,0],a);
}

/**
 * @method skew
 * 斜切变换
 * @param {Float32Array|Array.<Number>} a
 * @param {Float32Array|Array.<Number>} v
 */
export function skew(a, v) {
    return mul([1,v[1],v[0],1,0,0],a);
}

/**
 * @method sinx
 * @param {*} x x position 
 * @param {*} y y position
 */
export function sinx(x,y){
    return y/(mathSqrt(x*x+y*y));
}

/**
 * @method asinx
 * @param {*} x x position 
 * @param {*} y y position
 */
export function asinx(x,y){
    let sin=sinx(x,y);
    return mathAsin(sin);
}

/**
 * @method cosx
 * @param {*} x x position 
 * @param {*} y y position
 */
export function cosx(x,y){
    return x/(mathSqrt(x*x+y*y));
}

/**
 * @method atanx
 * @param {*} x x position 
 * @param {*} y y position
 */
export function atanx(x,y){
    return mathAtan(y/x);
}

/**
 * 向量加法
 * @param {*} v1 
 * @param {*} v2 
 */
export function addVector(v1,v2){
    return [v1[0]+v2[0],v1[1]+v2[1]];
}

/**
 * 向量减法
 * @param {*} v1 
 * @param {*} v2 
 */
export function minusVector(v1,v2){
    return [v1[0]-v2[0],v1[1]-v2[1]];
}

/**
 * @method vectorRotate
 * Roate vector to an angel.
 * 
 * @param {*} v 
 * @param {*} radian 
 */
export function rotateVector(v,radian){
    return [v[0]*mathCos(radian)+v[1]*mathSin(radian),-v[0]*mathSin(radian)+v[1]*mathCos(radian)];
}

/**
 * 矩阵左乘向量
 */
export function transformVector(v, m) {
    var x = v[0];
    var y = v[1];
    let out=[];
    out[0] = m[0] * x + m[2] * y + m[4];
    out[1] = m[1] * x + m[3] * y + m[5];
    return out;
}

/**
 * 点乘
 * @param {*} v1 
 * @param {*} v2 
 */
export function dot(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1];
}

/**
 * Change origin from fromOrigin to toOrigin.
 * @param {Array} fromOrigin    Origin1 coordinate in global space.
 * @param {Array} toOrigin      Origin2 coordinate in global space.
 * @param {Array} point         The point coordinate in fromOrigin.
 */
export function changeOrigin(fromOrigin,toOrigin,point){
    return [point[0]+fromOrigin[0]-toOrigin[0],point[1]+fromOrigin[1]-toOrigin[1]];
}


/**
 * 求两个点构成的向量 sin 值
 * 
 * @param {*} point0 
 * @param {*} point1 
 */
export function sinp2(point0,point1){
    let deltaX=point1[0]-point0[0];
    let deltaY=point1[1]-point0[1];
    return deltaY/mathSqrt(deltaX*deltaX+deltaY*deltaY);
}

/**
 * 求两个点构成的向量 cos 值
 * 
 * @param {*} point0 
 * @param {*} point1 
 */
export function cosp2(point0,point1){
    let deltaX=point1[0]-point0[0];
    let deltaY=point1[1]-point0[1];
    return deltaX/mathSqrt(deltaX*deltaX+deltaY*deltaY);
}
