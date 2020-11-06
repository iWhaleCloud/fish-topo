import Path from '../Path';
import Linkable from '../link/Linkable';
import * as classUtil from '../../utils/class_util';

/**
 * @class fishTopo.graphic.shape.Shape 
 * Base class of all the shapes.
 * 
 * 
 * 所有形状类的基类。
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
class Shape extends Path{
    constructor(options){
        super(options);
        
        this.type='shape';

        classUtil.inheritProperties(this,Linkable,this.options);
        classUtil.copyOwnProperties(this,this.options,['style','shape']);
    }

    toJSONObject(){
        let result=Path.prototype.toJSONObject.call(this);
        result.linkable=this.linkable;
        return result;
    }
}

classUtil.mixin(Shape, Linkable);
export default Shape;