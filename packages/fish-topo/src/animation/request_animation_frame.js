/**
 * 兼容多种运行环境的 requestAnimationFrame 方法。
 * 有两个重要的地方会依赖此方法：
 * - 元素的渲染机制，在 Painter 类中会调用
 * - 元素的动画效果，在 Animation 类中会调用
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
 */
export default (
    typeof window !== 'undefined'
    && (
        (window.requestAnimationFrame && window.requestAnimationFrame.bind(window))
        || (window.msRequestAnimationFrame && window.msRequestAnimationFrame.bind(window))
        || window.mozRequestAnimationFrame
        || window.webkitRequestAnimationFrame
    )
) || function (func) {
    setTimeout(func, 16);// 1000ms/60，每秒60帧，每帧约16ms
};
