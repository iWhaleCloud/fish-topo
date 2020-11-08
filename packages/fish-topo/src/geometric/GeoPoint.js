
/**
 * @class fishTopo.geometric.GeoPoint
 * A geometrically point, invisible, no dimension, just used for mathematical operations.
 * This implementation is improved from http://diagramo.com/ .
 * 
 *  
 * 几何学意义上的点，它不可见，没有大小，用来进行数学运算。此实现从 diagramo 改进而来：http://diagramo.com/ 。
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
export default class GeoPoint{
    /**
     * @constructor GeoPoint
     * @param {*} x 
     * @param {*} y 
     */
    constructor(x=0,y=0){
        this.x = x;
        this.y = y;
    }

    /**
     * @static
     * @method load
     * Creates a {GeoPoint} out of JSON parsed object.
     * 
     * 
     * 从 JSON 对象创建 {GeoPoint} 实例。
     * @param {JSONObject} o the JSON parsed object
     * @return {GeoPoint} a newly constructed GeoPoint
     */
    static load(o){
        return new GeoPoint(Number(o.x), Number(o.y));
    }

    /**
     * @static
     * @method loadArray
     * Creates an array of points from an array of {JSONObject}s.
     * 
     * 
     * 从 {JSONObject} 数组创建实例。
     * @param {Array} v the array of JSONObjects
     * @return an {Array} of {GeoPoint}s
     */
    static loadArray(v){
        let newPoints = [];
        for(let i=0; i< v.length; i++){
            newPoints.push(GeoPoint.load(v[i]));
        }
        return newPoints;
    }

    /**
     * @static
     * @method cloneArray
     * Clones an array of points.
     * 
     * 
     * 克隆一组点。
     * @param {Array} v - the array of {GeoPoint}s
     * @return an {Array} of {GeoPoint}s
     */
    static cloneArray(v){
        let newPoints = [];
        for(let i=0; i< v.length; i++){
            newPoints.push(v[i].clone());
        }
        return newPoints;
    }

    /**
     * @static
     * @method pointsToArray
     * @param {*} points 
     */
    static pointsToArray(points){
        let result = [];
        for(let i=0; i< points.length; i++){
            result.push([points[i].x,points[i].y]);
        }
        return result;
    }

    /**
     * @method toArray
     */
    toArray(){
        return [this.x,this.y];
    }

    /**
     * @method transform
     * @param {*} matrix 
     */
    transform(matrix){
        let oldX = this.x;
        let oldY = this.y;
        this.x = matrix[0][0] * oldX + matrix[0][1] * oldY + matrix[0][2];
        this.y = matrix[1][0] * oldX + matrix[1][1] * oldY + matrix[1][2];
    }

    /**
     * @method equals
     * Tests if this point is equals to other point.
     * 
     * 
     * 测试当前点是否与另一个点相等。
     * @param {GeoPoint} anotherPoint - the other point
     */
    equals(anotherPoint){
        return (this.x == anotherPoint.x) && (this.y == anotherPoint.y)
    }

    /**
     * @method clone
     * Clone current GeoPoint.
     * 
     * 
     * 克隆当前点。
     */
    clone(){
        let newPoint = new GeoPoint(this.x, this.y);
        return newPoint;
    }

    /**
     * @method add
     * @param {*} point 
     */
    add(point) {
        this.x = this.x + point.x;
        this.y = this.y + point.y;
        return this;
    }

    /**
     * @method near
     * Tests to see if a point (x, y) is within a range of current GeoPoint.
     * 
     * 
     * 测试某个点 (x,y) 是否处于当前 GeoPoint 的某个范围内。
     * @param {Numeric} x - the x coordinate of tested point
     * @param {Numeric} y - the x coordinate of tested point
     * @param {Numeric} radius - the radius of the vicinity
     */
    near(x, y, radius){
        let distance = Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2));
        return (distance <= radius);
    }

    /**
     * @method toString
     */
    toString(){
        return '[' + this.x + ',' + this.y + ']';
    }
}