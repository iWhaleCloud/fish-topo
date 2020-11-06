/* eslint-disable no-unused-vars */
import * as dataUtil from '../utils/data_structure_util';
import * as classUtil from '../utils/class_util';
import {Dispatcher} from '../utils/event_util';
import requestAnimationFrame from './request_animation_frame';

/**
 * @singleton
 * @class fishTopo.animation.GlobalAnimationMgr
 * 
 * Animation manager, global singleton, controls all the animation processes.
 * Each FishTopo instance has a GlobalAnimationMgr instance. GlobalAnimationMgr 
 * is designed to manage all the elements that are animating.
 * 
 * 动画管理器，全局单例，控制和调度所有动画过程。每个 FishTopo 实例中会持有一个 
 * GlobalAnimationMgr 实例。GlobalAnimationMgr 会管理 FishTopo 实例中的所有
 * 正在进行动画的元素。
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
// TODO Additive animation
// http://iosoteric.com/additive-animations-animatewithduration-in-ios-8/
// https://developer.apple.com/videos/wwdc2014/#236

class GlobalAnimationMgr{
    /**
     * @method constructor GlobalAnimationMgr
     * @param {Object} [options]
     */
    constructor(options){
        options = options || {};
        this._animatableMap=new Map();
        this._running = false;
        this._timestamp;
        this._pausedTime;//ms
        this._pauseStart;
        this._paused = false;
        Dispatcher.call(this);
    }

    /**
     * @method addAnimatable
     * @param {*} animatable 
     */
    addAnimatable(animatable){
        this._animatableMap.set(animatable.id,animatable);
    }

    /**
     * @method removeAnimatable
     * @param {*} animatable 
     */
    removeAnimatable(animatable) {
        this._animatableMap.delete(animatable.id);
    }

    /**
     * @private
     * @method _update
     */
    _update() {
        let time = new Date().getTime() - this._pausedTime;
        let delta = time - this._timestamp;

        this._animatableMap.forEach((animatable,index,map)=>{
            let ap=animatable.animationProcessList[0];
            if(!ap){
                this.removeAnimatable(animatable);
                return;
            }
            ap.nextFrame(time,delta);
        });

        this._timestamp = time;
        this.trigger('frame', delta);
    }

    /**
     * @private
     * @method _startLoop
     * Execute recursively with requestAnimationFrame.
     * The 60fps is a recommended standard of W3C, the nextFrame function
     * here will be called every 16ms.
     * If the _update() method here can't finish a round of animations in 16ms, there will be significant lags. 
     * 
     * 这里开始利用 requestAnimationFrame 递归执行，
     * 按照 W3C 的推荐标准 60fps，这里的 nextFrame 函数大约每隔 16ms 被调用一次，
     * 如果这里的 _update() 不能在 6ms 的时间内完成一轮动画，就会出现明显的卡顿。
     * @see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
     */
    _startLoop() {
        let self = this;
        this._running = true;
        function nextFrame() {
            if (self._running) {
                requestAnimationFrame(nextFrame);
                !self._paused && self._update();
            }
        }
        requestAnimationFrame(nextFrame);
    }

    /**
     * @method start
     * Start animating.
     * 
     * 
     * 启动动画。
     */
    start() {
        this._timestamp = new Date().getTime();
        this._pausedTime = 0;
        this._startLoop();
    }

    /**
     * @method pause
     * Pause the animations.
     * 
     * 
     * 暂停动画。
     */
    pause() {
        if (!this._paused) {
            this._pauseStart = new Date().getTime();
            this._paused = true;
        }
    }

    /**
     * @method resume
     * Resume the animations.
     * 
     * 
     * 恢复动画。
     */
    resume() {
        if (this._paused) {
            this._pausedTime += (new Date().getTime()) - this._pauseStart;
            this._paused = false;
        }
    }

    /**
     * @method clear
     * Clear the animations.
     * 
     * 
     * 清除动画。
     */
    clear() {
        this._animatableMap.forEach((animatable,index)=>{
            animatable.stopAnimation();
        });
        this._running = false;
        this._animatableMap=new Map();
    }
}

classUtil.mixin(GlobalAnimationMgr, Dispatcher);
export default GlobalAnimationMgr;