/* eslint-disable no-prototype-builtins */
import {dist, center} from '../utils/vector_util';
import * as eventUtil from '../utils/event_util';

/**
 * @class fishTopo.event.GestureMgr
 * 
 * Implement necessary gestures for mobile platform.
 * 
 * 
 * 手势管理器，用来兼容移动端操作。
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

let recognizers = {
    pinch(track, event) {
        let trackLen = track.length;
        if (!trackLen) {
            return;
        }

        let pinchEnd = (track[trackLen - 1] || {}).points;
        let pinchPre = (track[trackLen - 2] || {}).points || pinchEnd;

        if (pinchPre
            && pinchPre.length > 1
            && pinchEnd
            && pinchEnd.length > 1
        ) {
            let pinchScale = dist(pinchEnd[0],pinchEnd[1]) / dist(pinchPre[0],pinchPre[1]);
            !isFinite(pinchScale) && (pinchScale = 1);

            event.pinchScale = pinchScale;

            let pinchCenter = center(pinchEnd[0],pinchEnd[1]);
            event.pinchX = pinchCenter[0];
            event.pinchY = pinchCenter[1];

            return {
                type: 'pinch',
                target: track[0].target,
                event: event
            };
        }
    }

    // Only pinch currently.
};

class GestureMgr{
    constructor(){
        /**
         * @private
         * @property {Array<Object>}
         */
        this._track = [];
    }

    recognize(event, target, root) {
        this._doTrack(event, target, root);
        return this._recognize(event);
    }

    clear() {
        this._track.length = 0;
        return this;
    }

    _doTrack(event, target, root) {
        let touches = event.touches;

        if (!touches) {
            return;
        }

        let trackItem = {
            points: [],
            touches: [],
            target: target,
            event: event
        };

        for (let i = 0, len = touches.length; i < len; i++) {
            let touch = touches[i];
            let pos = eventUtil.clientToLocal(root, touch, {});
            trackItem.points.push([pos.topoX, pos.topoY]);
            trackItem.touches.push(touch);
        }

        this._track.push(trackItem);
    }

    _recognize(event) {
        for (let eventName in recognizers) {
            if (recognizers.hasOwnProperty(eventName)) {
                let gestureInfo = recognizers[eventName](this._track, event);
                if (gestureInfo) {
                    return gestureInfo;
                }
            }
        }
    }
}

export default GestureMgr;