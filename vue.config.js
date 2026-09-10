/* eslint-disable */
const webpack = require('webpack');
const path = require('path');
const childProcess = require('child_process');
const packageInfo = require('./package.json');

const devEnv = require('./config/webpack.dev.config');
const pordEnv = require('./config/webpack.prod.config');

let env = {};
if (process.env.NODE_ENV === 'development') {
  env = devEnv;
} else if (process.env.NODE_ENV === 'production') {
  env = pordEnv;
}

const padTimePart = (value) => `${value}`.padStart(2, '0');
const buildDate = new Date();
const buildTime = `${buildDate.getFullYear()}-${padTimePart(buildDate.getMonth() + 1)}-${padTimePart(buildDate.getDate())}`;
let buildCommit = 'unknown';
try {
  buildCommit = childProcess.execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { cwd: __dirname, encoding: 'utf8' }).trim();
} catch (error) {
  // Source archives may not contain Git metadata; keep a visible fallback.
}

process.env.VUE_APP_FLOO_WEB_VERSION = packageInfo.version;
process.env.VUE_APP_FLOO_WEB_BUILD_COMMIT = buildCommit;
process.env.VUE_APP_FLOO_WEB_BUILD_TIME = buildTime;

module.exports = {
  lintOnSave: true,
  productionSourceMap: false,
  // outputDir: path.resolve(__dirname, 'dist'),  // 默认dist
  chainWebpack: (config) => {
    config.resolve.alias
      .set('@src', path.join(__dirname, 'src'))
      // .set('vue', path.join('vue', 'dist', 'vue.js'))
      .set('/', path.join(__dirname, '/'))
      .set('@proj', path.resolve(__dirname))
      .set('@build', path.join(__dirname, 'build'))
      .set('models', path.resolve(__dirname, 'src/models/'))
      .set('services', path.resolve(__dirname, 'src/services/'))
      .set('utils', path.resolve(__dirname, 'src/utils/'));
  },

  configureWebpack: env
};
