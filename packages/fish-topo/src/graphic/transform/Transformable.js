import {mathSqrt, mathMin, mathMax, mathAbs} from '../../utils/constants';
import * as matrixUtil from '../../utils/affine_matrix_util';
import * as vectorUtil from '../../utils/vector_util';
import * as dataUtil from '../../utils/data_structure_util';

/**
 * @abstract
 * @class fishTopo.graphic.transform.Transformable
 * 
 * Provide transformation functions for Element class, 
 * such as translate, scale, skew, rotation, shape, style.
 * 
 * 
 * 为 Element 类提供变换功能，例如：平移、缩放、扭曲、旋转、翻转、形状、样式。
 * 
 * TODO:用新的事件机制和继承机制，把 Element 类里面与变形有关的逻辑移到本类中来，保持 Element 干净整洁。
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Transformations
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

let scaleTmp = [];

/**
 * @method constructor Transformable
 */
let Transformable = function (options={}) {
    /**
     * @property {Array<Number>} origin
     * The origin point of transformation, default as (0,0) of canvas.
     * 
     * 
     * 几何变换的原点，默认为 canvas 最左上角的(0,0)点。
     */
    this.origin = (options.origin===null||options.origin===undefined)?[0, 0]:options.origin;

    /**
     * @property {Array<Number>} rotation
     * The rotation in radian.
     * 
     * 
     * 旋转弧度。
     */
    this.rotation = (options.rotation===null||options.rotation===undefined)?0:options.rotation;

    /**
     * @property {Array<Number>} position
     * The translate array, for better understanding, we use position to replace the
     * word translate defined in W3C canvas standard.
     * 
     * 
     * 平移，数组。为了方便理解，用 position 这个名字来替代 W3C canvas 标准里面的 translate 。
     */
    this.position = (options.position===null||options.position===undefined)?[0, 0]:options.position;
    
    /**
     * @property {Array<Number>} scale
     * The scale array.
     * 
     * 
     * 缩放，数组。
     */
    this.scale = (options.scale===null||options.scale===undefined)?[1, 1]:options.scale;

    /**
     * @property {Array<Number>} skew
     * The skew array.
     * 
     * 
     * 斜切，数组。
     */
    this.skew = (options.skew===null||options.skew===undefined)?[0, 0]:options.skew;

    /**
     * @property {Matrix} transform
     * The transform matri. To work with the animation system better, 
     * do NOT modify transform directly, except SVGPainter.
     * 
     * 
     * 变换矩阵。为了能和动画机制很好地配合，请不要直接修改 transform 属性， SVGPainter 除外。
     */
    this.transform=matrixUtil.create();

    /**
     * @property {Matrix} inverseTransform
     * The inverse transform matrix.
     * 
     * 
     * 逆变换矩阵。
     */
    this.inverseTransform=null;

    /**
     * @property {Number} globalScaleRatio
     * The global scale ratio.
     * 
     * 
     * 全局缩放比例
     */
    this.globalScaleRatio=1;
};

Transformable.prototype={
    constructor:Transformable,

    /**
     * @method needLocalTransform
     * If the change is less than 5e-5(0.00005), there is no need to do any transform.
     * 
     * 
     * 如果变化的值小于5e-5（0.00005），则不需要变换。
     * 
     * @return {Boolean}
     */
    needLocalTransform:function () {
        return dataUtil.isNotAroundZero(this.rotation)
            || dataUtil.isNotAroundZero(this.position[0])
            || dataUtil.isNotAroundZero(this.position[1])
            || dataUtil.isNotAroundZero(this.scale[0] - 1)
            || dataUtil.isNotAroundZero(this.scale[1] - 1)
            || dataUtil.isNotAroundZero(this.skew[0] - 1)
            || dataUtil.isNotAroundZero(this.skew[1] - 1);
    },

    /**
     * @method applyTransform
     * 
     * Apply this.transform matrix to canvas context.
     * 
     * 
     * 将 this.transform 应用到 canvas context 上。
     * 
     * @param {CanvasRenderingContext2D} ctx
     */
    applyTransform:function (ctx) {
        let m = this.transform;
        let dpr = ctx.dpr || 1;
        if (m) {
            ctx.setTransform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * m[4], dpr * m[5]);
        }else {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    },

    /**
     * @method restoreTransform
     * Restore the transform matrix.
     * 
     * 
     * 重置变换矩阵。
     * @param {Context} ctx 
     */
    restoreTransform:function (ctx) {
        let dpr = ctx.dpr || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    /**
     * @method getLocalTransform
     * Get local transform matrix.
     * 
     * Note: This implementation did NOT consider the matrix multiplication order of 
     * affine, because the API invoker will not notice the transform order when provide
     * the config object, but always use the transform order of intuitive sense, that is:
     * skew->scale->rotation->position.
     * 
     *      @example
     *      rect.animate()
     *      .when(1000,{
     *          position:[100,100],
     *          skew:[2,2],
     *          scale:[2,2],
     *          rotate:Math.PI
     *      })
     *      .when(2000,{
     *          position:[200,100],
     *          scale:[1,1],
     *          skew:[1,1],
     *          rotate:-Math.PI
     *      })
     *      .start();
     * 
     * There is a big disadvantage of this implementation, it can not coordinate with the 
     * transform attribute in SVG tags. 
     * For example: <path transform="rotation(Math.PI);scale(2,2);">,
     * means apply some rotation first, then apply scale, this require
     * strict operation orders of affine, but the implementation here can NOT support it.
     * 
     * 
     * 获取本地变换矩阵。
     * 
     * 注意：这里的实现没有考虑仿射变换中的矩阵乘法顺序，因为 API 调用者
     * 在提供配置项时并不会留意数学意义上的变换顺序，而总是采用的直觉意义
     * 上的变换顺序，也就是：skew->scale->rotation->position 。
     * 
     *      @example
     *      rect.animate()
     *      .when(1000,{
     *          position:[100,100],
     *          skew:[2,2],
     *          scale:[2,2],
     *          rotate:Math.PI
     *      })
     *      .when(2000,{
     *          position:[200,100],
     *          scale:[1,1],
     *          skew:[1,1],
     *          rotate:-Math.PI
     *      })
     *      .start();
     * 
     * 
     * 这种实现方式有一个重大的缺点，它不能很好地对应 SVG 中的 transform 机制，
     * 比如：<path transform="rotation(Math.PI);scale(2,2);">
     * 这个 transform 属性表达的意思是：先 rotation ，然后 scale ，这就要求严格按照
     * 仿射变换的顺序来进行矩阵运算，但是这里的实现不能支持这种操作。
     */
    getLocalTransform:function () {
        let origin = this.origin || [0,0];
        let rotation = this.rotation || 0;
        let position = this.position || [0,0];
        let scale = this.scale || [1,1];
        let skew = this.skew || [0,0];

        let m=matrixUtil.create();
        // move origin point
        m[4] -= origin[0];
        m[5] -= origin[1];
        
        m = matrixUtil.skew(m, skew);
        m = matrixUtil.scale(m, scale);
        m = matrixUtil.rotate(m, rotation);

        // move origin back
        m[4] += origin[0];
        m[5] += origin[1];
    
        // translate
        m[4] += position[0];
        m[5] += position[1];

        return m;
    },

    /**
     * @method composeParentTransform
     * This method is designed to compose the transform matrix from parent. 
     * We needt this method to compose the transfromation from parent when the elements are nested.
     * 
     * 
     * 此方法的主要作用是复合父层的变换矩阵，当元素出现嵌套时，需要此方法来复合父层上的变换。
     */
    composeParentTransform:function () {
        let needLocalTransform = this.needLocalTransform();
        let m = matrixUtil.identity(this.transform);

        // transformation of self
        if (needLocalTransform) {
            m=this.getLocalTransform();
        }

        // transformation of parent element
        let parent = this.parent;
        let parentHasTransform = parent && parent.transform;
        if (parentHasTransform) {
            if (needLocalTransform) {
                m=matrixUtil.mul(parent.transform, m);
            }else {
                matrixUtil.copy(m, parent.transform);
            }
        }

        // global scale
        if (this.globalScaleRatio != null && this.globalScaleRatio !== 1) {
            this.getGlobalScale(scaleTmp);
            let relX = scaleTmp[0] < 0 ? -1 : 1;
            let relY = scaleTmp[1] < 0 ? -1 : 1;
            let sx = ((scaleTmp[0] - relX) * this.globalScaleRatio + relX) / scaleTmp[0] || 0;
            let sy = ((scaleTmp[1] - relY) * this.globalScaleRatio + relY) / scaleTmp[1] || 0;
            
            m[0] *= sx;
            m[1] *= sx;
            m[2] *= sy;
            m[3] *= sy;
        }
        
        this.transform = m;
        this.inverseTransform = this.inverseTransform || matrixUtil.create();
        this.inverseTransform = matrixUtil.invert(this.inverseTransform, m);
        return this.transform;
    },

    /**
     * @method getGlobalScale
     * Get global scale.
     * 
     * 
     * 获取全局缩放比例。
     * @return {Array<Number>}
     */
    getGlobalScale:function (out=[]) {
        let m = this.transform;
        out[0] = mathSqrt(m[0] * m[0] + m[1] * m[1]);// scale in X axis
        out[1] = mathSqrt(m[2] * m[2] + m[3] * m[3]);// scale in Y axis
        if (m[0] < 0) {
            out[0] = -out[0];
        }
        if (m[3] < 0) {
            out[1] = -out[1];
        }
        return out;
    },

    /**
     * @method globalToLocal
     * Tanslate global coordinate to local space of shape.
     * 
     * 
     * 变换坐标位置到 shape 的局部坐标空间。
     * @param {Number} x
     * @param {Number} y
     * @return {Array<Number>}
     */
    globalToLocal:function (x, y) {
        let v2 = [x, y];
        let inverseTransform = this.inverseTransform;
        if (inverseTransform) {
            vectorUtil.applyTransform(v2, v2, inverseTransform);
        }
        return v2;
    },

    /**
     * @method localToGlobal
     * Translate local coordinate of element to global space.
     * 
     * 
     * 变换局部坐标位置到全局坐标空间。
     * @param {Number} x
     * @param {Number} y
     * @return {Array<Number>}
     */
    localToGlobal:function (x, y) {
        let v2 = [x, y];
        let transform = this.composeParentTransform();
        vectorUtil.applyTransform(v2, v2, transform);
        return v2;
    },

    /**
     * @method getOuterBoundingRect
     * Get the bounding rect in global space, this rect will not apply transformation itself, but it will 
     * surround the transformed element.
     * 
     * 
     * 全局坐标系中的边界矩形，此矩形本身不进行几何变换，但是会包围变形之后的元素。
     */
    getOuterBoundingRect:function(){
        let rect=this.getBoundingRect();
        
        let points=[];
        points[0]=[rect.x1,rect.y1];
        points[1]=[rect.x2,rect.y1];
        points[2]=[rect.x2,rect.y2];
        points[3]=[rect.x1,rect.y2];
        
        points[0]=matrixUtil.transformVector(points[0],this.transform);
        points[1]=matrixUtil.transformVector(points[1],this.transform);
        points[2]=matrixUtil.transformVector(points[2],this.transform);
        points[3]=matrixUtil.transformVector(points[3],this.transform);

        let minX=mathMin(points[0][0],points[1][0],points[2][0],points[3][0]);
        let maxX=mathMax(points[0][0],points[1][0],points[2][0],points[3][0]);
        let minY=mathMin(points[0][1],points[1][1],points[2][1],points[3][1]);
        let maxY=mathMax(points[0][1],points[1][1],points[2][1],points[3][1]);

        return {
            x1:minX,
            y1:minY,
            x2:maxX,
            y2:maxY,
            width:mathAbs(maxX-minX),
            height:mathAbs(maxY-minY)
        };
    }
}
export default Transformable;