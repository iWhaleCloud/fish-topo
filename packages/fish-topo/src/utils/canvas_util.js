import guid from './guid';

/**
 * 创建 canvas 实例
 * @param {String} id
 * @param {Number} width
 * @param {Number} height
 * @param {Number} dpr
 * @return {Canvas}
 */
export function createCanvas(id, width, height, dpr) {
    let canvas = document.createElement('canvas');

    if(id==null||id==undefined){
        id=guid();
    }
    canvas.setAttribute('data-topo-dom-id', id);
    
    if(width==null
        ||width==undefined
        ||height==null
        ||height==undefined){
        return canvas
    }

    // Canvas instance has no style attribute in nodejs.
    if (canvas.style) {
        canvas.style.position = 'absolute';
        canvas.style.left = 0;
        canvas.style.top = 0;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
    }

    if(dpr==null||dpr==undefined){
        return canvas
    }

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    return canvas;
}

export function getContext(canvasInstance){
    if(!canvasInstance){
        canvasInstance=createCanvas();
    }
    return canvasInstance.getContext('2d');
}
