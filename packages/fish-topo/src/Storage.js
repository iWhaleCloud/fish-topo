/* eslint-disable no-unused-vars */
import * as classUtil from './utils/class_util';
import Eventful from './event/Eventful';
import env from './utils/env';
import timsort from './utils/timsort';

/**
 * @class fishTopo.core.Storage
 * Global storage, has 3 core features:
 * - Store and manage all the objects in FishTopo instance.
 * - Manage the displaylist.
 * - Cooperate with Painter to render the elements. Painter will get the display list from Storage, in this case Storage is used as a transfer 
 * station, we can skip the drawing process for those elements that do NOT need to be rendered, this will help us improve the performance.
 * 
 * 
 * 全局仓库，有3个主要核心功能：
 * - 存储和管理 FishTopo 中的所有对象。
 * - 管理显示列表。
 * - 与 Painter 配合，渲染元素。Painter 会从 Storage 中获取显示列表进行绘图，利用 Storage 作为中转站，对于不需要刷新的对象可以不绘制，从而可以提升整体性能。
 * @docauthor 大漠穷秋 damoqiongqiu@126.com
 */

/**
 * @method constructor Storage
 */
let Storage = function () { // jshint ignore:line
    /**
     * @private
     * This is used to store the elements displayed in the canvas itself, not nested in other element.
     * 
     * 
     * 存储直接放在画布上的对象，而不是嵌套在其它元素中的对象。
     * @property _roots
     */
    this._roots = new Map();

    /**
     * @private
     * The display list.
     * 
     * 显示列表。
     * @property _displayList
     */
    this._displayList = [];

    /**
     * @private
     * Length of display list.
     * 
     * 
     * 显示列表的长度。
     * 
     * @property _displayListLen
     */
    this._displayListLen = 0;

    classUtil.inheritProperties(this,Eventful);
};

Storage.prototype = {

    constructor: Storage,

    /**
     * @method traverse
     * @param  {Function} cb
     * @param  {Object} context
     */
    traverse: function (cb, context) {
        this._roots.forEach((el,id,map)=>{
            el.traverse(cb,context);
        });
    },

    /**
     * @method getDisplayList
     * Get the display list.
     * 
     * 
     * 获取显示列表。
     * 
     * @param {Boolean} [needUpdate=false] 
     * Wether update the list before returnning.
     * 
     * 
     * 是否在返回前更新该数组。
     * @param {Boolean} [includeIgnore=false] 
     * Wether include the ignore array, this is valid when needUpdate is true.
     * 
     * 
     * 是否包含 ignore 的数组, 在 needUpdate 为 true 的时候有效。
     * @return {Array<Displayable>}
     */
    getDisplayList: function (needUpdate, includeIgnore) {
        includeIgnore = includeIgnore || false;
        if (needUpdate) {
            this.updateDisplayList(includeIgnore);
        }
        return this._displayList;
    },

    /**
     * @method updateDisplayList
     * Update the display list, will be invoked before each redering process. 
     * This method will traverse the whole tree using deep first method, update all the transformations of Groups and Shapes, 
     * save all the visiable Shapes into an array. Finally, the array is sorted by the piority, zlevel > z > insert order.
     * 
     * 
     * 更新显示列表，每次绘制前都会调用。
     * 该方法会先深度优先遍历整个树，更新所有 Group 和 Shape 的变换并且把所有可见的Shape保存到数组中，
     * 最后根据优先级排序得到绘制队列，zlevel > z > 插入顺序。
     * @param {Boolean} [includeIgnore=false] 
     * Wether include the ignore array.
     * 
     * 
     * 是否包含 ignore 的数组。
     */
    updateDisplayList: function (includeIgnore) {
        this._displayListLen = 0;
        let displayList = this._displayList;

        this._roots.forEach((el,id,map)=>{
            this._updateAndAddDisplayable(el, null, includeIgnore);//recursive update
        });

        displayList.length = this._displayListLen;
        env.canvasSupported && timsort(displayList, this.displayableSortFunc);
    },

    displayableSortFunc: function(a, b) {
        if (a.qlevel === b.qlevel) {
            if (a.z === b.z) {
                // if (a.z2 === b.z2) {
                //     // FIXME Slow has renderidx compare
                //     // http://stackoverflow.com/questions/20883421/sorting-in-javascript-should-every-compare-function-have-a-return-0-statement
                //     // https://github.com/v8/v8/blob/47cce544a31ed5577ffe2963f67acb4144ee0232/src/js/array.js#L1012
                //     return a.__renderidx - b.__renderidx;
                // }
                return a.z2 - b.z2;
            }
            return a.z - b.z;
        }
        return a.qlevel - b.qlevel;
    },

    /**
     * @method _updateAndAddDisplayable
     * @param {*} el 
     * @param {*} clipPaths 
     * @param {*} includeIgnore 
     */
    _updateAndAddDisplayable: function (el, clipPaths, includeIgnore) {
        if (el.ignore && !includeIgnore) {
            return;
        }

        if (el.__dirty) {
            el.composeParentTransform();
        }

        let userSetClipPath = el.clipPath;
        if (userSetClipPath) {
            // FIXME:performance issue here
            if (clipPaths) {
                clipPaths = clipPaths.slice();
            }else {
                clipPaths = [];
            }
            let currentClipPath = userSetClipPath;
            let parentClipPath = el;
            // Recursively add clip path
            while (currentClipPath) {
                // clipPath 的变换是基于使用这个 clipPath 的元素
                currentClipPath.parent = parentClipPath;
                currentClipPath.composeParentTransform();
                clipPaths.push(currentClipPath);
                parentClipPath = currentClipPath;
                currentClipPath = currentClipPath.clipPath;
            }
        }

        el.__clipPaths = clipPaths;
        this._displayList[this._displayListLen++] = el;
        
        if (el.type==='group') {
            let children = el.children;
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                // Force to mark as dirty if group is dirty
                // FIXME: __dirtyPath ?
                if (el.__dirty) {
                    child.__dirty = true;
                }
                this._updateAndAddDisplayable(child, clipPaths, includeIgnore);
            }
        }
    },

    /**
     * @method addToRoot
     * Add element to root.
     * 
     * 
     * 添加元素到根节点。
     * @param {Element} el
     */
    addToRoot: function (el) {
        if (el.__storage === this) {
            return;
        }
        this.trigger("beforeAddToRoot",el);
        el.trigger("beforeAddToRoot",el);
        this.addToStorage(el);
    },

    /**
     * @method delFromRoot
     * Delete element from root.
     * 
     * 
     * 删除指定元素。
     * @param {string|Array.<String>} [el] 如果为空清空整个Storage
     */
    delFromRoot: function (el) {
        if (el == null) {// Clear all.
            this._roots.forEach((el,id,map)=>{
                this.delFromStorage(el);
            });
            this._roots = new Map();
            this._displayList = [];
            this._displayListLen = 0;
            return;
        }

        if (el.forEach) {// Array like.
            el.forEach((item,index)=>{
                this.delFromRoot(item);
            });
            return;
        }

        this.delFromStorage(el);
    },

    /**
     * @method addToStorage
     * Add element to Storage.
     * 
     * 
     * 把元素添加到 Storage 中。
     * @param {Element} el 
     */
    addToStorage: function (el) {
        this._roots.set(el.id,el);
        this.trigger("addToStorage",el);
        el.trigger("addToStorage",this);
        return this;
    },

    getElement:function(id){
        return this._roots.get(id);
    },

    /**
     * @method delFromStorage
     * Delete element from Storage.
     * 
     * 
     * 从 Storage 中删除元素。
     * @param {Element} el 
     */
    delFromStorage: function (el) {
        if(this._roots.get(el.id)){
            this._roots.delete(el.id);
            this.trigger("delFromStorage",el);
            el.trigger("delFromStorage",this);
        }
        return this;
    },

    /**
     * @method dispose
     * Clear and dispose Storage.
     * 
     * 
     * 清空并且释放 Storage。
     */
    dispose: function () {
        this._renderList =null;
        this._roots = null;
    }
};

classUtil.mixin(Storage, Eventful);
export default Storage;