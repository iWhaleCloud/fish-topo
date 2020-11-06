#!/usr/bin/env node
const fsExtra = require('fs-extra');
const {resolve} = require('path');
const commander = require('commander');
const path = require('path');
const {build, watch,color, travelSrcDir, bundleForNode} = require('./build-utils');
const ecDir = path.resolve(__dirname, '../..');
const srcDir = path.resolve(__dirname, '../../src');
const libDir = path.resolve(__dirname, '../../lib');
const config = require('./config.js');

/**
 * Compatible with prevoius folder structure: `fish-topo/lib` exists in `node_modules`
 */
function publishForNodeJS() {
    fsExtra.removeSync(libDir);
    fsExtra.ensureDirSync(libDir);
    travelSrcDir(srcDir, ({fileName, relativePath, absolutePath}) => {
        bundleForNode({
            inputPath: absolutePath,
            outputPath: path.resolve(libDir, relativePath, fileName)
        });
    });

    bundleForNode({
        inputPath: path.resolve(ecDir, 'fish-topo.all.js'),
        outputPath: path.resolve(ecDir, 'index.js')
    });

    console.log(color('fgGreen', 'bright')(`All done, ${new Date().toLocaleString()}.`));
};

function run() {
    /**
     * Tips for `commander`:
     * (1) If arg xxx not specified, `commander.xxx` is undefined.
     *     Otherwise:
     *      If '-x, --xxx', `commander.xxx` can only be true/false, even if '--xxx yyy' input.
     *      If '-x, --xxx <some>', the 'some' string is required, or otherwise error will be thrown.
     *      If '-x, --xxx [some]', the 'some' string is optional, that is, `commander.xxx` can be boolean or string.
     * (2) `node ./build/build.js --help` will print helper info and exit.
     */

    commander
        .usage('[options]')
        .description('Build fish-topo and generate result files in directory `fish-topo/dist` ')
        .option(
            '--release',
            'Build all for release'
        )
        .option(
            '--prepublish',
            'Build all for release'
        )
        .option(
            '-w, --watch',
            'Watch modifications of files and auto-compile to dist file (e.g., `fish-topo/dist/fish-topo.js`).'
        )
        .option(
            '--min',
            'Whether to compress the output file.'
        )
        .parse(process.argv);

    let isWatch = !!commander.watch;
    let isRelease = !!commander.release;
    let isPrePublish = !!commander.prepublish;
    let min = !!commander.min;

    if (isWatch) {
        watch(config.create());
    }else if (isPrePublish) {
        publishForNodeJS();
    }else if (isRelease) {
        fsExtra.removeSync(getPath('./dist'));
        build([
            config.create(false), // generate fish-topo.js
            config.create(true)   // generate fish-topo.min.js
        ]).then(function () {
            publishForNodeJS();
        }).catch(handleBuildError);
    }else {
        build([config.create(min)]).catch(handleBuildError);
    }
}

function handleBuildError(err) {
    console.log(err);
}

/**
 * @param {String} relativePath Based on fish-topo directory.
 * @return {String} Absolute path.
 */
function getPath(relativePath) {
    return resolve(__dirname, '../', relativePath);
}

run();
