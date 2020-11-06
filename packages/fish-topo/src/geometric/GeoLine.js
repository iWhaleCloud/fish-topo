import GeoPoint from './GeoPoint';
import {mathMin, mathMax, mathAbs, mathSqrt, mathPow} from '../utils/constants';

/**
 * @class fishTopo.geometric.GeoLine
 * A geometrically line, invisible, no dimension, just used for mathematical operations.
 * This implementation is improved from http://diagramo.com/ .
 * 
 *  
 * 几何学意义上的直线，它不可见，没有宽度，用来进行数学运算。此实现从 diagramo 改进而来：http://diagramo.com/ 。
 * 
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
export default class GeoLine{
    constructor(startPoint, endPoint){
        this.startPoint = startPoint;
        this.endPoint = endPoint;
    }

    /**
     * @static
     * @method load
     * Creates a {GeoLine} out of JSON parsed object.
     * 
     * 
     * 从 JSON 对象创建直线。
     * @param {JSONObject} o - the JSON parsed object
     * @return {GeoLine} a newly constructed GeoLine
     */
    static load(o){
        let newLine = new GeoLine(
            GeoPoint.load(o.startPoint),
            GeoPoint.load(o.endPoint)
        );
        return newLine;
    }

    /** 
     * @method constants
     * Tests to see if a point belongs to this line (not as infinite line but more like a segment)
     * Algorithm: Compute line's equation and see if (x, y) verifies it.
     * 
     * 
     * 测试某个点是否位于直线上（这里不是数学意义上的无线延长直线，而是线段）。
     * 算法：计算斜率，看(x,y)点是否位于线段上。
     * @param {Number} x - the X coordinates
     * @param {Number} y - the Y coordinates
     */
    contains(x, y){
        // if the point is inside rectangle bounds of the segment
        if (mathMin(this.startPoint.x, this.endPoint.x) <= x
            && x <= mathMax(this.startPoint.x, this.endPoint.x)
            && mathMin(this.startPoint.y, this.endPoint.y) <= y
            && y <= mathMax(this.startPoint.y, this.endPoint.y)) {

            // check for vertical line
            if (this.startPoint.x == this.endPoint.x) {
                return x == this.startPoint.x;
            } else { // usual (not vertical) line can be represented as y = a * x + b
                let a = (this.endPoint.y - this.startPoint.y) / (this.endPoint.x - this.startPoint.x);
                let b = this.startPoint.y - a * this.startPoint.x;
                return y == a * x + b;
            }
        } else {
            return false;
        }
    }

    /**
     * @method near
     * See if we are near a {GeoLine} by a certain radius (also includes the extremities into computation).
     * 
     * 
     * 测试某个点是否在某个角度上接近 {GeoLine} （断点也计算在内）。
     * 
     * @param {Number} x - the x coordinates
     * @param {Number} y - the y coordinates
     * @param {Number} radius - the radius to search for
     * @see http://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
     * @see "Mathematics for Computer Graphics, 2nd Ed., by John Vice, page 227"
     */
    near(x,y,radius){
        if(this.endPoint.x === this.startPoint.x){ //Vertical line, so the vicinity area is a rectangle
            return ( (this.startPoint.y-radius<=y && this.endPoint.y+radius>=y)
                    || (this.endPoint.y-radius<=y && this.startPoint.y+radius>=y))
            && x > this.startPoint.x - radius && x < this.startPoint.x + radius ;
        }

        if(this.startPoint.y === this.endPoint.y){ //Horizontal line, so the vicinity area is a rectangle
            return ( (this.startPoint.x - radius<=x && this.endPoint.x+radius>=x)
                    || (this.endPoint.x-radius<=x && this.startPoint.x+radius>=x))
                    && y>this.startPoint.y-radius && y<this.startPoint.y+radius ;
        }

        let startX = mathMin(this.endPoint.x,this.startPoint.x);
        let startY = mathMin(this.endPoint.y,this.startPoint.y);
        let endX = mathMax(this.endPoint.x,this.startPoint.x);
        let endY = mathMax(this.endPoint.y,this.startPoint.y);

        /*We will compute the distance from point to the line
         * by using the algorithm from
         * http://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
         * */

        //First we need to find a,b,c of the line equation ax + by + c = 0
        let a = this.endPoint.y - this.startPoint.y;
        let b = this.startPoint.x - this.endPoint.x;
        let c = -(this.startPoint.x * this.endPoint.y - this.endPoint.x * this.startPoint.y);

        //Secondly we get the distance "Mathematics for Computer Graphics, 2nd Ed., by John Vice, page 227"
        let d = mathAbs( (a*x + b*y + c) / mathSqrt(mathPow(a,2) + mathPow(b,2)) );

        //Thirdly we get coordinates of closest line's point to target point
        //http://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line#Cartesian_coordinates
        let closestX = (b * (b*x - a*y) - a*c) / ( mathPow(a,2) + mathPow(b,2) );
        let closestY = (a * (-b*x + a*y) - b*c) / ( mathPow(a,2) + mathPow(b,2) );

        let r = ( d <= radius && endX>=closestX && closestX>=startX && endY>=closestY && closestY>=startY ) //the projection of the point falls INSIDE of the segment
            || this.startPoint.near(x,y,radius) || this.endPoint.near(x,y,radius); //the projection of the point falls OUTSIDE of the segment

        return  r;
    }

    /**
     * @method getPoints
     * Get an arry composed by the start point and end point of the line.
     * 
     * 
     * 获取端点构成的数组。
     */
    getPoints(){
        let points = [];
        points.push(this.startPoint);
        points.push(this.endPoint);
        return points;
    }

    /**
     * @method getPoint
     * Return the {GeoPoint} corresponding the t certain t value.
     * 
     * 
     * 获取指定百分比上的点，参数 t 是百分比。
     * @param {Number} t the value of parameter t, where t in [0,1], t is like a percent
     */
    getPoint(t){
        let xp = t * (this.endPoint.x - this.startPoint.x) + this.startPoint.x;
        let yp = t * (this.endPoint.y - this.startPoint.y) + this.startPoint.y;
        return new GeoPoint(xp, yp);
    }

    /**
     * @method clone
     */
    clone(){
        let ret = new GeoLine(this.startPoint.clone(), this.endPoint.clone());
        return ret;
    }

    /**
     * @equals
     * @param {*} anotherLine 
     */
    equals(anotherLine){
        if(!(anotherLine instanceof GeoLine)){
            return false;
        }
        return this.startPoint.equals(anotherLine.startPoint)&& this.endPoint.equals(anotherLine.endPoint)
    }

    /**
     * @method toString
     */
    toString(){
        return 'line(' + this.startPoint + ',' + this.endPoint + ')';
    }
}