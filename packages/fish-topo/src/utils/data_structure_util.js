/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable no-prototype-builtins */
import {mathFloor} from './constants';

/**
 * 用来操作数据的一些工具函数。
 */

// 用于处理merge时无法遍历Date等对象的问题
var BUILTIN_OBJECT = {
    '[object Function]': 1,
    '[object RegExp]': 1,
    '[object Date]': 1,
    '[object Error]': 1,
    '[object CanvasGradient]': 1,
    '[object CanvasPattern]': 1,
    // For node-canvas
    '[object Image]': 1,
    '[object Canvas]': 1
};

var TYPED_ARRAY = {
    '[object Int8Array]': 1,
    '[object Uint8Array]': 1,
    '[object Uint8ClampedArray]': 1,
    '[object Int16Array]': 1,
    '[object Uint16Array]': 1,
    '[object Int32Array]': 1,
    '[object Uint32Array]': 1,
    '[object Float32Array]': 1,
    '[object Float64Array]': 1
};

var objToString = Object.prototype.toString;

var arrayProto = Array.prototype;
var nativeForEach = arrayProto.forEach;
var nativeFilter = arrayProto.filter;
var nativeSlice = arrayProto.slice;
var nativeMap = arrayProto.map;
var nativeReduce = arrayProto.reduce;

// Avoid assign to an exported variable, for transforming to cjs.
var methods = {};

export function $override(name, fn) {
    // Clear ctx instance for different environment
    if (name === 'createCanvas') {
        _ctx = null;//FIXME:fix this ugly code.
    }

    methods[name] = fn;
}

/**
 * Those data types can be cloned:
 *     Plain object, Array, TypedArray, number, string, null, undefined.
 * Those data types will be assgined using the orginal data:
 *     BUILTIN_OBJECT
 * Instance of user defined class will be cloned to a plain object, without
 * properties in prototype.
 * Other data types is not supported (not sure what will happen).
 *
 * Caution: do not support clone Date, for performance consideration.
 * (There might be a large number of date in `series.data`).
 * So date should not be modified in and out of echarts.
 *
 * @param {*} source
 * @return {*} new
 */
export function clone(source) {
    if (source == null || typeof source !== 'object') {
        return source;
    }

    var result = source;
    var typeStr = objToString.call(source);
    var i = 0;
    var len = 0;

    if (typeStr === '[object Array]') {
        if (!isPrimitive(source)) {
            result = [];
            for (i = 0, len = source.length; i < len; i++) {
                result[i] = clone(source[i]);
            }
        }
    }
    else if (TYPED_ARRAY[typeStr]) {
        if (!isPrimitive(source)) {
            var Ctor = source.constructor;
            if (source.constructor.from) {
                result = Ctor.from(source);
            }
            else {
                result = new Ctor(source.length);
                for (i = 0, len = source.length; i < len; i++) {
                    result[i] = clone(source[i]);
                }
            }
        }
    }
    else if (!BUILTIN_OBJECT[typeStr] && !isPrimitive(source) && !isDom(source)) {
        result = {};
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                result[key] = clone(source[key]);
            }
        }
    }

    return result;
}

/**
 * @param {*} target
 * @param {*} source
 * @param {Boolean} [overwrite=false]
 */
export function merge(target, source, overwrite) {
    // We should escapse that source is string
    // and enter for ... in ...
    if (!isObject(source) || !isObject(target)) {
        return overwrite ? clone(source) : target;
    }

    for (var key in source) {
        if (source.hasOwnProperty(key)) {
            var targetProp = target[key];
            var sourceProp = source[key];

            if (isObject(sourceProp)
                && isObject(targetProp)
                && !isArray(sourceProp)
                && !isArray(targetProp)
                && !isDom(sourceProp)
                && !isDom(targetProp)
                && !isBuiltInObject(sourceProp)
                && !isBuiltInObject(targetProp)
                && !isPrimitive(sourceProp)
                && !isPrimitive(targetProp)
            ) {
                // 如果需要递归覆盖，就递归调用merge
                merge(targetProp, sourceProp, overwrite);
            }
            else if (overwrite || !(key in target)) {
                // 否则只处理overwrite为true，或者在目标对象中没有此属性的情况
                // NOTE，在 target[key] 不存在的时候也是直接覆盖
                target[key] = clone(source[key], true);
            }
        }
    }

    return target;
}

/**
 * @param {Array} targetAndSources The first item is target, and the rests are source.
 * @param {Boolean} [overwrite=false]
 * @return {*} target
 */
export function mergeAll(targetAndSources, overwrite) {
    var result = targetAndSources[0];
    for (var i = 1, len = targetAndSources.length; i < len; i++) {
        result = merge(result, targetAndSources[i], overwrite);
    }
    return result;
}

/**
 * @param {*} target
 * @param {*} source
 */
export function extend(target, source) {
    for (var key in source) {
        if (source.hasOwnProperty(key)) {
            target[key] = source[key];
        }
    }
    return target;
}

/**
 * 查询数组中元素的index
 */
export function indexOf(array, value) {
    if (array) {
        if (array.indexOf) {
            return array.indexOf(value);
        }
        for (var i = 0, len = array.length; i < len; i++) {
            if (array[i] === value) {
                return i;
            }
        }
    }
    return -1;
}

/**
 * Consider typed array.
 * @param {Array|TypedArray} data
 */
export function isArrayLike(data) {
    if (!data) {
        return;
    }
    if (typeof data === 'string') {
        return false;
    }
    return typeof data.length === 'number';
}

/**
 * 数组或对象遍历
 * @param {Object|Array} obj
 * @param {Function} cb
 * @param {*} [context]
 */
export function each(obj, cb, context) {
    if (!(obj && cb)) {
        return;
    }
    if (obj.forEach && obj.forEach === nativeForEach) {
        obj.forEach(cb, context);
    }
    else if (obj.length === +obj.length) {
        for (var i = 0, len = obj.length; i < len; i++) {
            cb.call(context, obj[i], i, obj);
        }
    }
    else {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                cb.call(context, obj[key], key, obj);
            }
        }
    }
}

/**
 * 数组映射
 * @param {Array} obj
 * @param {Function} cb
 * @param {*} [context]
 * @return {Array}
 */
export function map(obj, cb, context) {
    if (!(obj && cb)) {
        return;
    }
    if (obj.map && obj.map === nativeMap) {
        return obj.map(cb, context);
    }
    else {
        var result = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            result.push(cb.call(context, obj[i], i, obj));
        }
        return result;
    }
}

/**
 * @param {Array} obj
 * @param {Function} cb
 * @param {Object} [memo]
 * @param {*} [context]
 * @return {Array}
 */
export function reduce(obj, cb, memo, context) {
    if (!(obj && cb)) {
        return;
    }
    if (obj.reduce && obj.reduce === nativeReduce) {
        return obj.reduce(cb, memo, context);
    }
    else {
        for (var i = 0, len = obj.length; i < len; i++) {
            memo = cb.call(context, memo, obj[i], i, obj);
        }
        return memo;
    }
}

/**
 * 数组过滤
 * @param {Array} obj
 * @param {Function} cb
 * @param {*} [context]
 * @return {Array}
 */
export function filter(obj, cb, context) {
    if (!(obj && cb)) {
        return;
    }
    if (obj.filter && obj.filter === nativeFilter) {
        return obj.filter(cb, context);
    }
    else {
        var result = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            if (cb.call(context, obj[i], i, obj)) {
                result.push(obj[i]);
            }
        }
        return result;
    }
}

/**
 * 数组项查找
 * @param {Array} obj
 * @param {Function} cb
 * @param {*} [context]
 * @return {*}
 */
export function find(obj, cb, context) {
    if (!(obj && cb)) {
        return;
    }
    for (var i = 0, len = obj.length; i < len; i++) {
        if (cb.call(context, obj[i], i, obj)) {
            return obj[i];
        }
    }
}

/**
 * @param {Function} func
 * @param {*} context
 * @return {Function}
 */
export function bind(func, context) {
    var args = nativeSlice.call(arguments, 2);
    return function () {
        return func.apply(context, args.concat(nativeSlice.call(arguments)));
    };
}

/**
 * @param {Function} func
 * @return {Function}
 */
export function curry(func) {
    var args = nativeSlice.call(arguments, 1);
    return function () {
        return func.apply(this, args.concat(nativeSlice.call(arguments)));
    };
}

/**
 * @param {*} value
 * @return {Boolean}
 */
export function isArray(value) {
    return objToString.call(value) === '[object Array]';
}

/**
 * @param {*} value
 * @return {Boolean}
 */
export function isFunction(value) {
    return typeof value === 'function';
}

/**
 * @param {*} value
 * @return {Boolean}
 */
export function isString(value) {
    return objToString.call(value) === '[object String]';
}

export function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * @param {*} value
 * @return {Boolean}
 */
export function isObject(value) {
    // Avoid a V8 JIT bug in Chrome 19-20.
    // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
    // Note: Modify this implementation might cause some trouble.
    var type = typeof value;
    return type === 'function' || (!!value && type === 'object');
}

/**
 * @param {*} value
 * @return {Boolean}
 */
export function isBuiltInObject(value) {
    return !!BUILTIN_OBJECT[objToString.call(value)];
}

/**
 * @param {*} value
 * @return {Boolean}
 */
export function isTypedArray(value) {
    return !!TYPED_ARRAY[objToString.call(value)];
}

/**
 * @param {*} value
 * @return {Boolean}
 */
export function isDom(value) {
    return typeof value === 'object'
        && typeof value.nodeType === 'number'
        && typeof value.ownerDocument === 'object';
}

/**
 * Whether is exactly NaN. Notice isNaN('a') returns true.
 * @param {*} value
 * @return {Boolean}
 */
export function eqNaN(value) {
    /* eslint-disable-next-line no-self-compare */
    return value !== value;
}

/**
 * If value1 is not null, then return value1, otherwise judget rest of values.
 * Low performance.
 * @return {*} Final value
 */
export function retrieve(values) {
    for (var i = 0, len = arguments.length; i < len; i++) {
        if (arguments[i] != null) {
            return arguments[i];
        }
    }
}

export function retrieve2(value0, value1) {
    return value0 != null
        ? value0
        : value1;
}

export function retrieve3(value0, value1, value2) {
    return value0 != null
        ? value0
        : value1 != null
        ? value1
        : value2;
}

/**
 * @param {Array} arr
 * @param {Number} startIndex
 * @param {Number} endIndex
 * @return {Array}
 */
export function slice() {
    return Function.call.apply(nativeSlice, arguments);
}

/**
 * Normalize css liked array configuration
 * e.g.
 *  3 => [3, 3, 3, 3]
 *  [4, 2] => [4, 2, 4, 2]
 *  [4, 3, 2] => [4, 3, 2, 3]
 * @param {number|Array.<Number>} val
 * @return {Array<Number>}
 */
export function normalizeCssArray(val) {
    if (typeof (val) === 'number') {
        return [val, val, val, val];
    }
    var len = val.length;
    if (len === 2) {
        // vertical | horizontal
        return [val[0], val[1], val[0], val[1]];
    }
    else if (len === 3) {
        // top | horizontal | bottom
        return [val[0], val[1], val[2], val[1]];
    }
    return val;
}

/**
 * @param {Boolean} condition
 * @param {String} message
 */
export function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

/**
 * @param {String} str string to be trimed
 * @return {String} trimed string
 */
export function trim(str) {
    if (str == null) {
        return null;
    }
    else if (typeof str.trim === 'function') {
        return str.trim();
    }
    else {
        return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    }
}

var primitiveKey = '__ec_primitive__';
/**
 * Set an object as primitive to be ignored traversing children in clone or merge
 */
export function setAsPrimitive(obj) {
    obj[primitiveKey] = true;
}

export function isPrimitive(obj) {
    return obj[primitiveKey];
}

/**
 * @constructor
 * @param {Object} obj Only apply `ownProperty`.
 */
function HashMap(obj) {
    var isArr = isArray(obj);
    // Key should not be set on this, otherwise
    // methods get/set/... may be overrided.
    this.data = {};
    var thisMap = this;

    (obj instanceof HashMap)
        ? obj.each(visit)
        : (obj && each(obj, visit));

    function visit(value, key) {
        isArr ? thisMap.set(value, key) : thisMap.set(key, value);
    }
}

HashMap.prototype = {
    constructor: HashMap,
    // Do not provide `has` method to avoid defining what is `has`.
    // (We usually treat `null` and `undefined` as the same, different
    // from ES6 Map).
    get: function (key) {
        return this.data.hasOwnProperty(key) ? this.data[key] : null;
    },
    set: function (key, value) {
        // Comparing with invocation chaining, `return value` is more commonly
        // used in this case: `var someVal = map.set('a', genVal());`
        return (this.data[key] = value);
    },
    // Although util.each can be performed on this hashMap directly, user
    // should not use the exposed keys, who are prefixed.
    each: function (cb, context) {
        context !== void 0 && (cb = bind(cb, context));
        /* eslint-disable guard-for-in */
        for (var key in this.data) {
            this.data.hasOwnProperty(key) && cb(this.data[key], key);
        }
        /* eslint-enable guard-for-in */
    },
    // Do not use this method if performance sensitive.
    removeKey: function (key) {
        delete this.data[key];
    }
};

export function createHashMap(obj) {
    return new HashMap(obj);
}

export function concatArray(a, b) {
    var newArray = new a.constructor(a.length + b.length);
    for (var i = 0; i < a.length; i++) {
        newArray[i] = a[i];
    }
    var offset = a.length;
    for (i = 0; i < b.length; i++) {
        newArray[i + offset] = b[i];
    }
    return newArray;
}


export function noop() {}

/**
 * @param  {Number} p0
 * @param  {Number} p1
 * @param  {Number} percent
 * @return {Number}
 */
export function interpolateNumber(p0, p1, percent) {
    return (p1 - p0) * percent + p0;
}

/**
 * 字符串插值
 * @param  {String} p0
 * @param  {String} p1
 * @param  {Number} percent
 * @return {String}
 */
export function interpolateString(p0, p1, percent) {
    return percent > 0.5 ? p1 : p0;
}

/**
 * 数组插值
 * @param  {Array} p0
 * @param  {Array} p1
 * @param  {Number} percent
 * @param  {Array} out
 * @param  {Number} arrDim
 */
export function interpolateArray(p0, p1, percent, out, arrDim) {
    var len = p0.length;
    var i = 0;
    if(!len) return;
    if (arrDim === 1) {
        for (i = 0; i < len; i++) {
            out[i] = interpolateNumber(p0[i], p1[i], percent);
        }
    }else {
        var len2 = p0[0].length;
        if(!len2) return;
        for (i = 0; i < len; i++) {
            if(out[i]===undefined){
                return;
            }
            for (var j = 0; j < len2; j++) {
                out[i][j] = interpolateNumber(p0[i][j], p1[i][j], percent);
            }
        }
    }
    return out;
}

// arr0 is source array, arr1 is target array.
// Do some preprocess to avoid error happened when interpolating from arr0 to arr1
export function fillArr(arr0, arr1, arrDim) {
    var arr0Len = arr0.length;
    var arr1Len = arr1.length;
    var i = 0;
    if (arr0Len !== arr1Len) {
        // FIXME Not work for TypedArray
        var isPreviousLarger = arr0Len > arr1Len;
        if (isPreviousLarger) {
            // Cut the previous
            arr0.length = arr1Len;
        }
        else {
            // Fill the previous
            for (i = arr0Len; i < arr1Len; i++) {
                arr0.push(
                    arrDim === 1 ? arr1[i] : Array.prototype.slice.call(arr1[i])
                );
            }
        }
    }
    // Handling NaN value
    var len2 = arr0[0] && arr0[0].length;
    for (i = 0; i < arr0.length; i++) {
        if (arrDim === 1) {
            if (isNaN(arr0[i])) {
                arr0[i] = arr1[i];
            }
        }
        else {
            for (var j = 0; j < len2; j++) {
                if (isNaN(arr0[i][j])) {
                    arr0[i][j] = arr1[i][j];
                }
            }
        }
    }
}


/**
 * @param  {Array} arr0
 * @param  {Array} arr1
 * @param  {Number} arrDim
 * @return {Boolean}
 */
export function isArraySame(arr0, arr1, arrDim) {
    if (arr0 === arr1) {
        return true;
    }
    var len = arr0.length;
    var i = 0;
    if (len !== arr1.length) {
        return false;
    }
    if (arrDim === 1) {
        for (i = 0; i < len; i++) {
            if (arr0[i] !== arr1[i]) {
                return false;
            }
        }
    }
    else {
        var len2 = arr0[0].length;
        for (i = 0; i < len; i++) {
            for (var j = 0; j < len2; j++) {
                if (arr0[i][j] !== arr1[i][j]) {
                    return false;
                }
            }
        }
    }
    return true;
}

/**
 * Catmull Rom interpolate array
 * @param  {Array} p0
 * @param  {Array} p1
 * @param  {Array} p2
 * @param  {Array} p3
 * @param  {Number} t
 * @param  {Number} t2
 * @param  {Number} t3
 * @param  {Array} out
 * @param  {Number} arrDim
 */
export function catmullRomInterpolateArray(p0, p1, p2, p3, t, t2, t3, out, arrDim) {
    var len = p0.length;
    var i = 0;
    if (arrDim === 1) {
        for (i = 0; i < len; i++) {
            out[i] = catmullRomInterpolate(
                p0[i], p1[i], p2[i], p3[i], t, t2, t3
            );
        }
    }
    else {
        var len2 = p0[0].length;
        for (i = 0; i < len; i++) {
            for (var j = 0; j < len2; j++) {
                out[i][j] = catmullRomInterpolate(
                    p0[i][j], p1[i][j], p2[i][j], p3[i][j],
                    t, t2, t3
                );
            }
        }
    }
}

/**
 * Catmull Rom interpolate number
 * @param  {Number} p0
 * @param  {Number} p1
 * @param  {Number} p2
 * @param  {Number} p3
 * @param  {Number} t
 * @param  {Number} t2
 * @param  {Number} t3
 * @return {Number}
 */
export function catmullRomInterpolate(p0, p1, p2, p3, t, t2, t3) {
    var v0 = (p2 - p0) * 0.5;
    var v1 = (p3 - p1) * 0.5;
    return (2 * (p1 - p2) + v0 + v1) * t3
            + (-3 * (p1 - p2) - 2 * v0 - v1) * t2
            + v0 * t + p1;
}

export function cloneValue(value) {
    if (isArrayLike(value)) {
        var len = value.length;
        if (isArrayLike(value[0])) {
            var ret = [];
            for (var i = 0; i < len; i++) {
                ret.push(Array.prototype.slice.call(value[i]));
            }
            return ret;
        }

        return Array.prototype.slice.call(value);
    }

    return value;
}

export function rgba2String(rgba) {
    rgba[0] = mathFloor(rgba[0]);
    rgba[1] = mathFloor(rgba[1]);
    rgba[2] = mathFloor(rgba[2]);

    return 'rgba(' + rgba.join(',') + ')';
}

export function getArrayDim(keyframes) {
    var lastValue = keyframes[keyframes.length - 1].value;
    return isArrayLike(lastValue && lastValue[0]) ? 2 : 1;
}

export function parseInt10(val) {
    return parseInt(val, 10);
}


let EPSILON = 5e-5;
export function isNotAroundZero(val) {
    return val > EPSILON || val < -EPSILON;
}

export function isAroundZero(val) {
    return !isNotAroundZero(val);
}

/**
 * 把一个嵌套多层的对象展平，变成一层结构
 */
function _isObject (value) {//TODO:fix me, something might be wrong with isObject() function above.
    return !!value && typeof value === 'object' && value.constructor === Object;
}
export function flattenObj(obj,flattenMap,path=""){
    for(let p in obj){
        path+=p;
        if(_isObject(obj[p])){
            path+='.';
            flattenObj(obj[p],flattenMap,path);
        }else{
            flattenMap.set(path,obj[p]);
            path=path.substr(0,path.lastIndexOf('.')+1);
        }
    }
}

export function setAttrByPath(obj,path,value){
    let arr=path.split(".");
    arr.forEach((key,index)=>{
        if(index==arr.length-1){
            obj[key]=value;            
        }else{
            if(!obj[key]){
                obj[key]={};
            }
            obj=obj[key];
        }
    });
}

export function getAttrByPath(obj,path){
    let arr=path.split(".");
    for(let i=0;i<arr.length;i++){
        let key=arr[i];
        if(i==arr.length-1){
            return obj[key];            
        }else{
            if(obj[key]===null||obj[key]===undefined){
                return null;
            }
            obj=obj[key];
        }
    }
}