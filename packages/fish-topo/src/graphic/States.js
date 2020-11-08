/* eslint-disable no-prototype-builtins */
import * as dataUtil from '../utils/data_structure_util';
import Style from './Style';
import {copy as vec2Copy} from '../utils/vector_util';

/**
 * @class fishTopo.graphic.GraphicStates
 * 
 * States machine for managing graphic states
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

let transitionProperties = ['position', 'rotation', 'scale', 'style', 'shape'];

let TransitionObject = function (opts) {
    if (typeof opts === 'string') {
        this._fromStr(opts);
    }
    else if (opts) {
        opts.property && (this.property = opts.property);
        opts.duration != null && (this.duration = opts.duration);
        opts.easing && (this.easing = opts.easing);
        opts.delay && (this.delay = opts.delay);
    }
    if (this.property !== '*') {
        this.property = this.property.split(',');
    }
    else {
        this.property = transitionProperties;
    }
};

TransitionObject.prototype = {

    constructor: TransitionObject,

    /**
     * List of all transition properties. Splitted by comma. Must not have spaces in the string.
     * e.g. 'position,style.color'. '*' will match all the valid properties.
     * @property {String}
     * @default *
     */
    property: '*',

    /**
     * @property {String}
     * @default 'Linear'
     */
    easing: 'Linear',

    /**
     * @property {Number}
     * @default 'number'
     */
    duration: 500,

    /**
     * @property {Number}
     */
    delay: 0,

    _fromStr: function (str) {
        let arr = str.split(/\s+/g);
        this.property = arr[0];
        this.duration = +arr[1];
        this.delay = +arr[2];
        this.easing = arr[3];
    }
};


/**
 * @method constructor GraphicStates
 * @property {Number} [qlevel]
 * @property {Number} [z]
 * @property {Array<Number>} {position}
 * @property {Array<Number>|number} {rotation}
 * @property {Array<Number>} {scale}
 * @property {Object} style
 * @property {Function} onenter
 * @property {Function} onleave
 * @property {Function} ontransition
 * @property {Array<IGraphicStateTransition|string>} transition Transition object or a string descriptor like '* 30 0 Linear'
 */
let GraphicStates = function (opts) {
    opts = opts || {};
    this._states = {};
    /**
     * @property _el
     */
    this._el = opts.el;
    this._subStates = [];
    this._transitionAnimationProcess = [];

    if (opts.initialState) {
        this._initialState = opts.initialState;
    }

    let optsStates = opts.states;
    if (optsStates) {
        for (let name in optsStates) {
            if (optsStates.hasOwnProperty(name)) {
                let state = optsStates[name];
                this._addState(name, state);
            }
        }
    }

    this.setState(this._initialState);
};

GraphicStates.prototype = {

    constructor: GraphicStates,

    /**
     * All other state will be extended from initial state
     * @property {String}
     * @private
     */
    _initialState: 'normal',

    /**
     * Current state
     * @property {String}
     * @private
     */
    _currentState: '',

    el: function () {
        return this._el;
    },

    _addState: function (name, state) {
        this._states[name] = state;

        if (state.transition) {
            state.transition = new TransitionObject(state.transition);
        }

        // Extend from initial state
        if (name !== this._initialState) {
            this._extendFromInitial(state);
        }
        else {
            let el = this._el;
            // setState 的时候自带的 style 和 shape 都会被直接覆盖
            // 所以这边先把自带的 style 和 shape 扩展到初始状态中
            dataUtil.merge(state.style, el.style, false, false);
            if (state.shape) {
                dataUtil.merge(state.shape, el.shape, false, true);
            }
            else {
                state.shape = dataUtil.clone(el.shape, true);
            }

            for (let name in this._states) {
                if (this._states.hasOwnProperty(name)) {
                    this._extendFromInitial(this._states[name]);
                }
            }
        }
    },

    _extendFromInitial: function (state) {
        let initialState = this._states[this._initialState];
        if (initialState && state !== initialState) {
            dataUtil.merge(state, initialState, false, true);
        }
    },

    setState: function (name, silent) {
        if (name === this._currentState
            && !this.transiting()
        ) {
            return;
        }

        let state = this._states[name];

        if (state) {
            this._stopTransition();

            if (!silent) {
                let prevState = this._states[this._currentState];
                if (prevState) {
                    prevState.onleave && prevState.onleave.call(this);
                }

                state.onenter && state.onenter.call(this);
            }

            this._currentState = name;

            if (this._el) {
                let el = this._el;

                // Setting attributes
                if (state.qlevel != null) {
                    el.qlevel = state.qlevel;
                }
                if (state.z != null) {
                    el.z = state.z;
                }

                // SRT
                state.position && vec2Copy(el.position, state.position);
                state.scale && vec2Copy(el.scale, state.scale);
                if (state.rotation != null) {
                    el.rotation = state.rotation;
                }

                // Style
                if (state.style) {
                    let initialState = this._states[this._initialState];
                    el.style = new Style();
                    if (initialState) {
                        el.style.extendStyle(initialState.style, false);
                    }
                    if (
                        // Not initial state
                        name !== this._initialState
                        // Not copied from initial state in _extendFromInitial method
                        && initialState.style !== state.style
                    ) {
                        el.style.extendStyle(state.style, true);
                    }
                }
                if (state.shape) {
                    el.shape = dataUtil.clone(state.shape, true);
                }

                el.dirty();
            }
        }

        for (let i = 0; i < this._subStates.length; i++) {
            this._subStates.setState(name);
        }
    },

    getState: function () {
        return this._currentState;
    },

    transitionState: function (target, done) {
        if (
            target === this._currentState
            && !this.transiting()
        ) {
            return;
        }

        let state = this._states[target];
        let styleShapeReg = /$[style|shape]\./;
        let self = this;

        // Animation 去重
        let propPathMap = {};

        if (state) {

            self._stopTransition();

            let el = self._el;

            if (state.transition && el && el.__topo) {// El can be animated
                let transitionCfg = state.transition;
                let property = transitionCfg.property;

                let animatingCount = 0;
                let animationDone = function () {
                    animatingCount--;
                    if (animatingCount === 0) {
                        self.setState(target);
                        done && done();
                    }
                };
                for (let i = 0; i < property.length; i++) {
                    let propName = property[i];

                    // Animating all the properties in style or shape
                    if (propName === 'style' || propName === 'shape') {
                        if (state[propName]) {
                            for (let key in state[propName]) {
                                /* eslint-disable max-depth */
                                if (!state[propName].hasOwnProperty(key)) {
                                    continue;
                                }
                                let path = propName + '.' + key;
                                if (propPathMap[path]) {
                                    continue;
                                }
                                /* eslint-enable max-depth */
                                propPathMap[path] = 1;
                                animatingCount += self._animProp(
                                    state, propName, key, transitionCfg, animationDone
                                );
                            }
                        }
                    }
                    else {
                        if (propPathMap[propName]) {
                            continue;
                        }
                        propPathMap[propName] = 1;
                        // Animating particular property in style or style
                        if (propName.match(styleShapeReg)) {
                            // remove 'style.', 'shape.' prefix
                            let subProp = propName.slice(0, 5);
                            propName = propName.slice(6);
                            animatingCount += self._animProp(
                                state, subProp, propName, transitionCfg, animationDone
                            );
                        }else {
                            animatingCount += self._animProp(
                                state, '', propName, transitionCfg, animationDone
                            );
                        }

                    }
                }
                // No transition properties
                if (animatingCount === 0) {
                    self.setState(target);
                    done && done();
                }
            }else {
                self.setState(target);
                done && done();
            }
        }

        let subStates = self._subStates;
        for (let i = 0; i < subStates.length; i++) {
            subStates.transitionState(target);
        }
    },

    /**
     * Do transition animation of particular property
     * @param {Object} state
     * @param {String} subPropKey
     * @param {String} key
     * @param {Object} transitionCfg
     * @param {Function} done
     * @private
     */
    _animProp: function (state, subPropKey, key, transitionCfg, done) {
        let el = this._el;
        let stateObj = subPropKey ? state[subPropKey] : state;
        let elObj = subPropKey ? el[subPropKey] : el;
        let availableProp = stateObj && (key in stateObj)
            && elObj && (key in elObj);

        let taps = this._transitionAnimationProcess;
        if (availableProp) {
            let obj = {};
            if (stateObj[key] === elObj[key]) {
                return 0;
            }
            obj[key] = stateObj[key];

            let animationProcess = el.animate(subPropKey)
                .when(transitionCfg.duration, obj)
                .delay(transitionCfg.dealy)
                .done(function () {
                    let idx = dataUtil.indexOf(taps, 1);
                    if (idx > 0) {
                        taps.splice(idx, 1);
                    }
                    done();
                })
                .start(transitionCfg.easing);
            taps.push(animationProcess);

            return 1;
        }
        return 0;
    },

    _stopTransition: function () {
        let taps = this._transitionAnimationProcess;
        for (let i = 0; i < taps.length; i++) {
            taps[i].stop();
        }
        taps.length = 0;
    },

    transiting: function () {
        return this._transitionAnimationProcess.length > 0;
    },

    addSubStates: function (states) {
        this._subStates.push(states);
    },

    removeSubStates: function (states) {
        let idx = dataUtil.indexOf(this._subStates, states);
        if (idx >= 0) {
            this._subStates.splice(states, 1);
        }
    }
};

export default GraphicStates;