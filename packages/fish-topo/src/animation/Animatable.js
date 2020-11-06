import AnimationProcess from './AnimationProcess';

/**
 * @abstract
 * @class fishTopo.animation.Animatable
 * This is an abstract class for animating. Any class needes animation functions can minxin this implementation.
 * The class mixines Animatable should also mixin Eventful to provide the event functions.
 * 
 * 
 * 动画抽象类。任何需要动画功能的类都可以 mixin 此实现。
 * 混入 Animatable 的类必须同时混入 Eventful ，因为动画过程中需要使用事件机制。
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

/**
 * @abstract
 * @method constructor Animatable
 */
let Animatable = function () {
    /**
     * @readonly
     * @property {fishTopo.animation.AnimationProcess} animationProcessList
     * A list to store the animation processes on current element instance.
     * 
     * 
     * 当前元素上的动画过程列表。
     */
    this.animationProcessList = [];
};

Animatable.prototype = {

    constructor: Animatable,

    /**
     * @method animate
     * Creat the AnimationProcess instance.
     * 
     * 
     * 创建 AnimationProcess 实例。
     * @param {String} path 
     * The path to fetch value from object, like 'a.b.c'.
     * 
     * 
     * 从对象上获取属性的路径，例如 'a.b.c'。
     * @param {Boolean} [loop=false] 
     * Whether to loop animation.
     * 
     * 
     * 动画是否循环播放。
     * @return {fishTopo.animation.AnimationProcess}
     */
    animate: function () {
        let animatable=this;
        let animationProcess = new AnimationProcess(animatable);
        animationProcess.on('done',()=>{
            animatable.removeAnimationProcess(animationProcess);
        });
        animationProcess.on('stop',()=>{
            animatable.removeAnimationProcess(animationProcess);
        });
        animatable.animationProcessList.push(animationProcess);
        if (animatable.__topo) {
            animatable.__topo.globalAnimationMgr.addAnimatable(animatable);
        }
        return animationProcess;
    },
    
    /**
     * @method stopAnimation
     * Stop the animation.
     * 
     * 
     * 停止动画。
     * @param {Boolean} forwardToLast 
     * If move to last frame before stop.
     * 
     * 
     * 在停止动画之前是否强制移动到最后一帧。
     */
    stopAnimation: function (forwardToLast=false) {
        this.animationProcessList.forEach((ap)=>{
            ap.stop(forwardToLast);
        });
        this.animationProcessList.length=0;
        return this;
    },

    /**
     * @method removeAnimationProcess
     * Remove the AnimationProcess。
     * 
     * 
     * 删除动画过程。
     * @param {AnimationProcess} animationProcess
     */
    removeAnimationProcess(animationProcess) {
        let index=this.animationProcessList.indexOf(animationProcess);
        if(index>=0){
            this.animationProcessList.splice(index,1);
        }
    }
};

export default Animatable;