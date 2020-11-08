const uglifyPlugin = require('rollup-plugin-uglify-es');
const {resolve} = require('path');

// Based on echarts/
function getPath(relativePath) {
    return resolve(__dirname, '../..', relativePath);
}

/**
 * @param {boolean} [min=false]
 */
function getPlugins(min) {
    let plugins = [];
    min && plugins.push(uglifyPlugin({
        compress: {
            // Eliminate __DEV__ code.
            'global_defs': {
                __DEV__: true
            }
        }
    }));

    return plugins;
}

/**
 * @param {boolean} [min=false]
 */
exports.create = function (min) {
    let postfixMin = min ? '.min' : '';

    return {
        plugins: getPlugins(min),
        input: getPath(`./fish-topo.all.js`),
        legacy: true, // Support IE8-
        output: {
            name: 'FishTopo', //global name
            format: 'umd',
            legacy: true,      // Must be declared both in inputOptions and outputOptions.
            sourcemap: !min,
            file: getPath(`dist/fish-topo${postfixMin}.js`)
        },
        watch: {
            include: [getPath('./src/**'), getPath('./fish-topo*.js')]
        }
    };
};
