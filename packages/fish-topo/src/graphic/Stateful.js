import States from './States';

/**
 * @class fishTopo.graphic.Stateful
 * 
 * Stateful mixin for graphic object
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
class Stateful{
    constructor(opts){
        if (opts.states) {
            this.initStates(opts.states);
        }
    }

    initStates(states) {
        this._states = new States({
            el: this,
            states: states
        });
    }

    setState(name) {
        this._states && this._states.setState(name);
    }

    getState() {
        return this._states && this._states.getState();
    }

    transitionState(name, done) {
        this._states && this._states.transitionState(name, done);
    }
}
export default Stateful;