let dpr = 1;

// If in browser environment
if (typeof window !== 'undefined') {
    dpr = Math.max(window.devicePixelRatio || 1, 1);
}

/**
 * config默认配置项
 * @exports fishTopo/config
 */

/**
 * Debug log mode:
 * 0: Do nothing, for release.
 * 1: console.error, for debug.
 */
export let debugMode = 0;

// retina 屏幕优化
export let devicePixelRatio = dpr;
