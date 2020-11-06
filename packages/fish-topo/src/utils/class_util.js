/* eslint-disable no-prototype-builtins */
/**
 * 构造类继承关系
 *
 * @param {Function} clazz 源类
 * @param {Function} baseClazz 基类
 */
export function inherits(clazz, baseClazz) {
    var clazzPrototype = clazz.prototype;
    function F() {}
    F.prototype = baseClazz.prototype;
    clazz.prototype = new F();

    for (var prop in clazzPrototype) {
        if (clazzPrototype.hasOwnProperty(prop)) {
            clazz.prototype[prop] = clazzPrototype[prop];
        }
    }
    clazz.prototype.constructor = clazz;
    clazz.superClass = baseClazz;
}

/**
 * @method inheritProperties
 * 
 * Copy properties and methods from super class, this method is designed for the classes which were not written in ES6 syntax.
 * 
 * 拷贝父类上的属性和方法，用来支持那些没有按照 ES6 语法编写的类。
 * 
 * @param {*} subInstance 子类的实例
 * @param {*} SuperClass 父类的类型
 * @param {*} opts 构造参数
 */
export function inheritProperties(subInstance,SuperClass,opts){
    SuperClass.call(subInstance,opts);
}

/**
 * 这里的 mixin 只拷贝 prototype 上的属性。
 * @param {Object|Function} target
 * @param {Object|Function} sorce
 * @param {Boolean} overlay
 */
export function mixin(target, source, overlay) {
    target = 'prototype' in target ? target.prototype : target;
    source = 'prototype' in source ? source.prototype : source;

    defaults(target, source, overlay);
}

/**
 * @param {*} target
 * @param {*} source
 * @param {Boolean} [overlay=false]
 */
export function defaults(target, source, overlay) {
    for (var key in source) {
        if (source.hasOwnProperty(key)
            && (overlay ? source[key] != null : target[key] == null)
        ) {
            target[key] = source[key];
        }
    }
    return target;
}

/**
 * @method copyOwnProperties
 * 
 * Copy own properties from source object to target object, exclude inherited ones.
 * 
 * 从目标对象上拷贝属性，拷贝过程中排除那些通过继承而来的属性。
 * 
 * @param {Object} target 
 * @param {Object} source 
 * @param {Array} excludes 
 */
export function copyOwnProperties(target,source,excludes=[]){
    for (let key in source) {
        if (source.hasOwnProperty(key)) {
            if(!excludes.includes(key)){
                target[key] = source[key];
            }
        }
    }
    return target;
}