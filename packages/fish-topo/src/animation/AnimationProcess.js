/* eslint-disable no-unused-vars */
import * as dataUtil from '../utils/data_structure_util';
import * as classUtil from '../utils/class_util';
import Track from './Track';
import Eventful from '../event/Eventful';

/**
 * @class fishTopo.animation.AnimationProcess
 * AnimationProcess represents for an entire animation process, each instance of the Element class has a list to store all the animation processes.
 * Each process in the list will be executed in order. Only one process can be in running state at a certain point. All the animation processes will be scheduled by the GlobalAnimationMgr class.
 * An event called 'done' will be trigged when the animation process finished. Current process will be deleted after the 'done' event is triggered.
 * If more than one process exists in the list, and one of them is set to run in loop mode, then any process behind it will not be executed.
 * 
 * 
 * AnimationProcess 表示一次完整的动画过程，每一个元素（Element）中都有一个列表，用来存储本实例上的所有动画过程。
 * 列表中的动画过程按照顺序获得运行机会，在特定的时间点上只有一个 AnimationProcess 处于运行状态，系统中的所有动画过程都由 GlobalAnimationMgr 类进行调度。 
 * AnimationProcess 运行完成之后会触发一个 done 事件，Element 实例在收到 done 事件之后，会把当前的动画过程从列表中删除。
 * 如果 Element 实例的动画过程列表中存在多个实例，其中某个过程是无限循环运行的，那么后续所有动画过程都不会获得到运行机会。
 * 
 * @author 大漠穷秋 <damoqiongqiu@126.com>
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

class AnimationProcess{
    /**
     * @method constructor AnimationProcess
     * @param {Object} element 
     * The element needes animating functions.
     * 
     * 
     * 需要动画功能的元素。
     */
    constructor(element){
        this.element = element;
        this._trackCacheMap = new Map();
        this._delay = 0;
        this._running = false;
        this._paused = false;
        classUtil.inheritProperties(this,Eventful,this.options);
    }

    /**
     * @method when
     * Create a track for each property that needs to be animated. The animation properties supported by FishTopo are position, shape, and style.
     * 
     * 
     * 为每一种需要进行动画的属性创建一条轨道，FishTopo 能支持动画的属性有 position、shape、style。
     * @param  {Number} time 
     * Lifetime of the keyframe, in milliseconds.
     * 
     * 
     * 关键帧的存活时间，单位是毫秒ms。
     * @param  {Object} config 
     * Properties of the keyframe, in key-value shape.
     * 
     * 
     * 关键帧的属性值，key-value 表示。
     * @return {fishTopo.animation.AnimationProcess}
     */
    when(time, config) {
        let flattenMap=new Map();
        dataUtil.flattenObj(config,flattenMap);
        flattenMap.forEach((value,key,map)=>{
            let track=this._trackCacheMap.get(key);
            if(!track){
                track=new Track({
                    element:this.element,
                    path:key,
                    delay:this._delay
                });
                //If there is no frame 0 in the config object, add an 0 frame automatically, use current properties of the element as the value of the 0 frame. 
                //如果参数中没有提供第 0 帧，自动补第 0 帧，以元素上当前的属性值为关键帧的值。
                if (time !== 0) {
                    let temp=dataUtil.getAttrByPath(this.element,key);
                    if(temp==null||temp==undefined){
                        temp=0;
                    }
                    track.addKeyFrame({
                        time: 0,
                        value: dataUtil.clone(temp)
                    });
                }
                this._trackCacheMap.set(key,track);
            }
            
            track.addKeyFrame({
                time: time,
                value: dataUtil.clone(value)
            });
        });
        return this;
    }

    /**
     * @method start
     * Start to execute the animation.
     * 
     * 开始执行动画。
     * @param  {Boolean} loop 
     * Whether loop the animation.
     * 
     * 
     * 是否循环。
     * @param  {String|Function} [easing] 
     * Name of the easing function, see {@link fishTopo.animation.easing easing engine}.
     * 
     * 
     * 缓动函数名称，详见{@link fishTopo.animation.easing 缓动引擎}。
     * @param  {Boolean} forceAnimate 
     * Whethe to force the animation.
     * 
     * 
     * 是否强制开启动画。
     * @return {fishTopo.animation.AnimationProcess}
     */
    start(loop=false, easing='',forceAnimate=false) {
        this._running=true;
        this._paused=false;
        this.trigger("start");
        if(!this._trackCacheMap.size){
            this.trigger("done");
            return this;
        }
        this._trackCacheMap.forEach((track,key,map)=>{
            track&&track.start(loop,easing,forceAnimate);
        });
        return this;
    }

    /**
     * @method nextFrame
     * Enter next frame.
     * 
     * 
     * 进入下一帧。
     * @param {Number} time  
     * Current time.
     * 
     * 
     * 当前时间。
     * @param {Number} delta 
     * Time offset.
     * 
     * 
     * 时间偏移量。
     */
    nextFrame(time,delta){
        this._running=true;
        this._paused=false;
        let deferredEvents = [];
        let deferredTracks = [];
        let percent="";
        let isFinished=true;

        this._trackCacheMap.forEach((track,key,map)=>{
            let result = track.nextFrame(time, delta);
            if (dataUtil.isString(result)) {
                deferredEvents.push(result);
                deferredTracks.push(track);
            }else if(dataUtil.isNumeric(result)){
                percent=result;
            }
            isFinished=isFinished&&track.isFinished;

            if(dataUtil.isNumeric(percent)){
                this.trigger("during",this.element,track._path,track._currentValue,percent);
            }
        });

        let len = deferredEvents.length;
        for (let i = 0; i < len; i++) {
            deferredTracks[i].fire(deferredEvents[i]);
        }

        if(isFinished){
            this.trigger("done");
        }
    }

    /**
     * @method stop
     * Stop the animation.
     * 
     * 
     * 停止动画。
     * @param {Boolean} forwardToLast 
     * Whether move to the last frame before animation stops.
     * 
     * 
     * 是否在动画停止之前跳到最后一帧。
     */
    stop(forwardToLast) {
        this._running=false;
        this._paused=false;
        this._trackCacheMap.forEach((track,key,map)=>{
            track.stop(this.element, 1);
        });
        this._trackCacheMap=new Map();
        this.trigger("stop");
        return this;
    }

    /**
     * @method pause
     * Pause the animation.
     * 
     * 
     * 暂停动画。
     */
    pause() {
        this._running=false;
        this._paused=true;
        this._trackCacheMap.forEach((track,key,map)=>{
            track.pause();
        });
        this.trigger("pause");
        return this;
    }

    /**
     * @method resume
     * Resume the animation.
     * 
     * 
     * 恢复动画。
     */
    resume() {
        this._running=true;
        this._paused=false;
        this._trackCacheMap.forEach((track,key,map)=>{
            track.resume();
        });
        this.trigger("resume");
        return this;
    }

    /**
     * @method during
     * Callback for each animation frame, this is to facilitate chained calls.
     * 
     * 
     * 每一帧的回调函数，方便链式调用。
     * @param  {Function} callback
     * @return {fishTopo.animation.AnimationProcess}
     */
    during(callback) {
        this.on("during",callback);
        return this;
    }

    /**
     * @method done
     * Callback function for the end of animation, this is to facilitate chained calls.
     * 
     * 
     * 添加动画结束的回调，方便链式调用。
     * @param  {Function} callback
     * @return {fishTopo.animation.AnimationProcess}
     */
    done(callback) {
        this.on("done",callback);
        return this;
    }

    /**
     * @method isFinished
     * Determine wether the entire animation process has finished, when the animations of all the tracks are finished, the animation process is finished. 
     * 
     * 
     * 判断整个动画过程是否已经完成，所有 Track 上的动画都完成则整个动画过程完成。
     */
    isFinished() {
        let isFinished=true;
        this._trackCacheMap.forEach((track,key,map)=>{
            if(!track.isFinished){
                isFinished=false;
            }
        });
        return isFinished;
    }

    /**
     * @method isPaused
     * Wether the process is paused.
     * 
     * 
     * 是否暂停。
     */
    isPaused() {
        return !!this._paused;
    }

    /**
     * @method delay
     * Set the delay time of current process.
     * 
     * 
     * 设置动画延迟开始的时间。
     * @param  {Number} time 
     * In milliseconds.
     * 
     * 
     * 单位ms。
     * @return {fishTopo.animation.AnimationProcess}
     */
    delay(time) {
        this._delay = time;
        return this;
    }
}

classUtil.mixin(AnimationProcess,Eventful);
export default AnimationProcess;