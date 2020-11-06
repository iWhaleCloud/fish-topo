import * as colorUtil from '../utils/color_util';
import * as dataUtil from '../utils/data_structure_util';
import Timeline from './Timeline';
import {mathMin} from '../utils/constants';

/**
 * @class fishTopo.animation.Track
 * There is an one-to-one correspondence between a track and a property of an element.
 * There are many properties on an element, multiple properties can change at the same time during the animation process.
 * Each property naturally becomes a track, all these changing processes will be encapsulated in the Track class.
 * 
 * 
 * Track, 轨道，与元素（Element）上可以用来进行动画的属性一一对应。
 * 元素上存在很多种属性，在动画过程中，可能会有多种属性同时发生变化，
 * 每一种属性天然成为一条动画轨道，把这些轨道上的变化过程封装在 Track 类中。
 * 
 * @author 大漠穷秋 <damoqiongqiu@126.com>
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

export default class Track{
    /**
     * @method constructor Track
     * @param {Object} options 
     */
    constructor(options){
        this.element=options.element;
        this.path=options.path;
        this.delay=options.delay;
        this.currentValue=null;
        this.isFinished=false;
        this.keyframes=[];
        this.timeline;
    }

    /**
     * @method addKeyFrame
     * Add a key frame.
     * 
     * 
     * 添加关键帧。
     * @param {Object} kf 数据结构为 {time:0,value:0}
     */
    addKeyFrame(kf){
        this.keyframes.push(kf);
    }

    /**
     * @method nextFrame
     * Enter the next frame.
     * 
     * 
     * 进入下一帧。
     * @param {Number} time  当前时间
     * @param {Number} delta 时间偏移量
     */
    nextFrame(time, delta){
        if(!this.timeline){
            return;
        }
        let result=this.timeline.nextFrame(time,delta);
        if(dataUtil.isString(result)&&result==='destroy'){
            this.isFinished=true;
        }
        // console.log(`result=${result}`);
        return result;
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
    fire(eventType, arg){
        this.timeline.fire(eventType, arg);
    }

    /**
     * @method start
     * Start the animation.
     * 
     * 
     * 开始动画。
     * @param {String} easing 缓动函数名称
     * @param {Boolean} forceAnimate 是否强制开启动画 
     */
    start(loop=false, easing='', forceAnimate=false){
        let options=this._parseKeyFrames(
            easing, 
            this.path, 
            loop,
            forceAnimate
        );

        //如果传入的参数不正确，则无法构造实例
        if(!options){
            return null;
        }
        let timeline = new Timeline(options);
        this.timeline=timeline;
    }

    /**
     * @method stop
     * Stop the animation
     * 
     * 
     * 停止动画。
     * @param {Boolean} forwardToLast 是否快进到最后一帧 
     */
    stop(forwardToLast){
        if (forwardToLast) {
            // Move to last frame before stop
            this.timeline&&this.timeline.onframe(this.element, 1);
        }
    }

    /**
     * @method pause
     * Pause the animation
     * 
     * 
     * 暂停。
     */
    pause(){
        this.timeline.pause();
    }

    /**
     * @method resume
     * Resume the animation.
     * 
     * 
     * 重启。
     */
    resume(){
        this.timeline.resume();
    }
    
    /**
     * @private
     * @method _parseKeyFrames
     * Parse the keyframes, create the timelines.
     * 
     * 
     * 解析关键帧，创建时间线。
     * @param {String} easing
     * @param {String} path
     * @param {Boolean} forceAnimate 
     */
    _parseKeyFrames(easing,path,loop,forceAnimate) {
        let self=this;
        let element=this.element;
        let useSpline = easing === 'spline';
    
        let kfLength = this.keyframes.length;
        if (!kfLength) {
            return;
        }
        
        // Guess data type
        let firstVal = this.keyframes[0].value;
        let isValueArray = dataUtil.isArrayLike(firstVal);
        let isValueColor = false;
        let isValueString = false;
    
        // For vertices morphing
        let arrDim = isValueArray ? dataUtil.getArrayDim(this.keyframes) : 0;
    
        this.keyframes.sort((a, b)=>{
            return a.time - b.time;
        });
    
        let trackMaxTime = this.keyframes[kfLength - 1].time;
        let kfPercents = [];
        let kfValues = [];
        let prevValue = this.keyframes[0].value;
        let isAllValueEqual = true;
    
        for (let i = 0; i < kfLength; i++) {
            kfPercents.push(this.keyframes[i].time / trackMaxTime);
            // Assume value is a color when it is a string
            let value = this.keyframes[i].value;
    
            // Check if value is equal, deep check if value is array
            if (!((isValueArray && dataUtil.isArraySame(value, prevValue, arrDim))
                || (!isValueArray && value === prevValue))) {
                isAllValueEqual = false;
            }
            prevValue = value;
    
            // Try converting a string to a color array
            if (typeof value === 'string') {
                let colorArray = colorUtil.parse(value);
                if (colorArray) {
                    value = colorArray;
                    isValueColor = true;
                }else {
                    isValueString = true;
                }
            }
            kfValues.push(value);
        }
        if (!forceAnimate && isAllValueEqual) {
            return;
        }
    
        let lastValue = kfValues[kfLength - 1];
        // Polyfill array and NaN value
        for (let i = 0; i < kfLength - 1; i++) {
            if (isValueArray) {
                dataUtil.fillArr(kfValues[i], lastValue, arrDim);
            }else {
                if (isNaN(kfValues[i]) && !isNaN(lastValue) && !isValueString && !isValueColor) {
                    kfValues[i] = lastValue;
                }
            }
        }
        if(isValueArray){
            let arr=dataUtil.getAttrByPath(element,path)
            dataUtil.fillArr(arr, lastValue, arrDim);
        }

        // Cache the key of last frame to speed up when
        // animation playback is sequency
        let lastFrame = 0;
        let lastFramePercent = 0;
        let start;
        let w;
        let p0;
        let p1;
        let p2;
        let p3;
        let rgba = [0, 0, 0, 0];
    
        let onframe = function (element, percent) {
            // Find the range keyframes
            // kf1-----kf2---------current--------kf3
            // find kf2 and kf3 and do interpolation
            let frame;
            // In the easing function like elasticOut, percent may less than 0
            if (percent < 0) {
                frame = 0;
            }else if (percent < lastFramePercent) {
                // Start from next key
                // PENDING start from lastFrame ?
                start = mathMin(lastFrame + 1, kfLength - 1);
                for (frame = start; frame >= 0; frame--) {
                    if (kfPercents[frame] <= percent) {
                        break;
                    }
                }
                // PENDING really need to do this ?
                frame = mathMin(frame, kfLength - 2);
            }else {
                for (frame = lastFrame; frame < kfLength; frame++) {
                    if (kfPercents[frame] > percent) {
                        break;
                    }
                }
                frame = mathMin(frame - 1, kfLength - 2);
            }
            lastFrame = frame;
            lastFramePercent = percent;
    
            let range = (kfPercents[frame + 1] - kfPercents[frame]);
            if (range === 0) {
                return;
            }else {
                w = (percent - kfPercents[frame]) / range;
            }
            
            if (useSpline) {
                p1 = kfValues[frame];
                p0 = kfValues[frame === 0 ? frame : frame - 1];
                p2 = kfValues[frame > kfLength - 2 ? kfLength - 1 : frame + 1];
                p3 = kfValues[frame > kfLength - 3 ? kfLength - 1 : frame + 2];
                if (isValueArray) {
                    let arr=dataUtil.getAttrByPath(element,path);
                    dataUtil.catmullRomInterpolateArray(
                        p0, p1, p2, p3, w, w * w, w * w * w,
                        arr,
                        arrDim
                    );
                    self.currentValue=arr;
                    element.dirty();
                }else {
                    let value;
                    if (isValueColor) {
                        value = dataUtil.catmullRomInterpolateArray(
                            p0, p1, p2, p3, w, w * w, w * w * w,
                            rgba, 1
                        );
                        value = dataUtil.rgba2String(rgba);
                    }else if (isValueString) {
                        // String is step(0.5)
                        value = dataUtil.interpolateString(p1, p2, w);
                    }else {
                        value = dataUtil.catmullRomInterpolate(
                            p0, p1, p2, p3, w, w * w, w * w * w
                        );
                    }
                    dataUtil.setAttrByPath(element,path,value);
                    self.currentValue=value;
                    element.dirty();
                }
            }else {
                if (isValueArray) {
                    let arr=dataUtil.getAttrByPath(element,path);
                    dataUtil.interpolateArray(
                        kfValues[frame], 
                        kfValues[frame + 1], 
                        w,
                        arr,
                        arrDim
                    );
                    self.currentValue=arr;
                    element.dirty();
                }else {
                    let value;
                    if (isValueColor) {
                        dataUtil.interpolateArray(
                            kfValues[frame], 
                            kfValues[frame + 1], 
                            w,
                            rgba, 1
                        );
                        value = dataUtil.rgba2String(rgba);
                    }else if (isValueString) {
                        // String is step(0.5)
                        value = dataUtil.interpolateString(kfValues[frame], kfValues[frame + 1], w);
                    }else {
                        value = dataUtil.interpolateNumber(kfValues[frame], kfValues[frame + 1], w);
                    }
                    dataUtil.setAttrByPath(element,path,value);
                    self.currentValue=value;
                    element.dirty();
                }
            }
        };
        
        let options={
            element:this.element,
            lifeTime: trackMaxTime,
            loop:loop,
            delay:this.delay,
            onframe: onframe,
            easing: (easing && easing !== 'spline')?easing:'Linear'
        };
        return options;
    }
}