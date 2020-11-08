import Path from './Path';
/**
 * @class fishTopo.graphic.CompoundPath 
 * 
 * CompoundPath to improve performance.
 * 
 * 复合路径，用来提升性能。
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
let defaultConfig={
    shape: {
        paths: null
    }
};

export default class CompoundPath extends Path{
    /**
     * @method constructor CompoundPath
     * @param {Object} opts 
     */
    constructor(opts){
        super(opts,defaultConfig);
        /**
         * @property {String} type
         */
        this.type='compound';

        this.on("beforeRender",this.beforeRenderHandler);
        this.on("afterRender",this.afterRenderHandler);
    }

    /**
     * @private
     * @method _updatePathDirty
     */
    _updatePathDirty() {
        let dirtyPath = this.__dirtyPath;
        let paths = this.shape.paths;
        for (let i = 0; i < paths.length; i++) {
            // Mark as dirty if any subpath is dirty
            dirtyPath = dirtyPath || paths[i].__dirtyPath;
        }
        this.__dirtyPath = dirtyPath;
        this.__dirty = this.__dirty || dirtyPath;
    }

    /**
     * @private
     * @method beforeRenderHandler
     */
    beforeRenderHandler() {
        this._updatePathDirty();
        let paths = this.shape.paths || [];
        let scale = this.getGlobalScale();
        // Update path scale
        for (let i = 0; i < paths.length; i++) {
            if (!paths[i].path) {
                paths[i].createPathProxy();
            }
            paths[i].path.setScale(scale[0], scale[1], paths[i].segmentIgnoreThreshold);
        }
    }
    
    /**
     * @private
     * @method afterRenderHandler
     */
    afterRenderHandler() {
        let paths = this.shape.paths || [];
        for (let i = 0; i < paths.length; i++) {
            paths[i].__dirtyPath = false;
        }
    }

    /**
     * @method buildPath
     * 绘制元素路径
     * @param {Object} ctx 
     * @param {String} shape 
     */
    buildPath(ctx, shape) {
        let paths = shape.paths || [];
        for (let i = 0; i < paths.length; i++) {
            paths[i].buildPath(ctx, paths[i].shape, true);
        }
    }

    /**
     * @private
     * @method getBoundingRect
     */
    getBoundingRect() {
        this._updatePathDirty();
        return Path.prototype.getBoundingRect.call(this);
    }
}