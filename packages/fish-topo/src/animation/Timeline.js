import easingFuncs from './easing';
import {mathMin} from '../utils/constants';

/**
 * @class fishTopo.animation.Timeline
 * Timeline, designed to calculate the value of an attribute at a specified point.
 * 
 * 
 * 时间线，用来计算元素上的某个属性在指定时间点上的数值。
 * 
 * @author 大漠穷秋 <damoqiongqiu@126.com>
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
export default class Timeline{
    /**
     * @method constructor Timeline
     * @param {Object} options 
     * @param {Element} options.element
     * @param {Number} options.life
     * @param {Number} options.delay
     * @param {Boolean} options.loop
     * @param {Number} options.gap
     * @param {Function} options.onframe
     * @param {String} options.easing
     * @param {Function} options.ondestroy
     * @param {Function} options.onrestart
     */
    constructor(options){
        this.element = options.element;
        this.lifeTime = options.lifeTime || 1000;
        this.delay = options.delay || 0;
        this.loop = options.loop == null ? false : options.loop;
        this.gap = options.gap || 0;
        this.easing = options.easing || 'Linear';
        this.onframe = options.onframe;
        this.ondestroy = options.ondestroy;
        this.onrestart = options.onrestart;
        this._initialized = false;
        this._pausedTime = 0;
        this._paused = false;
    }

    /**
     * @method nextFrame
     * Enter next frame.
     * 
     * 
     * 进入下一帧。
     * @param {Number} globalTime 当前时间
     * @param {Number} deltaTime  时间偏移量
     */
    nextFrame(globalTime, deltaTime) {
        // Set startTime on first frame, or _startTime may has milleseconds different between clips
        // PENDING
        if (!this._initialized) {
            this._startTime = globalTime + this.delay;
            this._initialized = true;
        }

        if (this._paused) {
            this._pausedTime += deltaTime;
            return;
        }

        let percent = (globalTime - this._startTime - this._pausedTime) / this.lifeTime;
        if (percent < 0) {
            return;
        }
        percent = mathMin(percent, 1);

        let easing = this.easing;
        let easingFunc = typeof easing === 'string'
            ? easingFuncs[easing] 
            : easing;
        let schedule = typeof easingFunc === 'function'
            ? easingFunc(percent)
            : percent;
        
        if (percent === 1) {
            if (this.loop) {
                this.restart(globalTime);
                return 'restart';
            }
            return 'destroy';
        }else{
            this.fire('frame', schedule);
            return percent;
        }
    }

    /**
     * @method restart
     * Restart the animation.
     * 
     * 
     * 重新开始动画。
     * @param {Number} globalTime 
     */
    restart(globalTime) {
        let remainder = (globalTime - this._startTime - this._pausedTime) % this.lifeTime;
        this._startTime = globalTime - remainder + this.gap;
        this._pausedTime = 0;
    }

    /**
     * @method fire
     * Fire an event.
     * 
     * 
     * 触发事件。
     * @param {String} eventType 
     * @param {Object} arg 
     */
    fire(eventType, arg) {
        eventType = 'on' + eventType;
        if (this[eventType]) {
            this[eventType](this.element, arg);
        }
    }

    /**
     * @method pause
     * Pause the animation.
     * 
     * 
     * 暂停动画。
     */
    pause() {
        this._paused = true;
    }

    /**
     * @method resume
     * Resume the animation.
     * 
     * 
     * 恢复运行。
     */
    resume() {
        this._paused = false;
    }
}