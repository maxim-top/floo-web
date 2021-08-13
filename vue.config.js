/* eslint-disable */
const webpack = require('webpack');
const path = require('path');

const devEnv = require('./config/webpack.dev.config');
const pordEnv = require('./config/webpack.prod.config');

let env = {};
if (process.env.NODE_ENV === 'development') {
  env = devEnv;
} else if (process.env.NODE_ENV === 'production') {
  env = pordEnv;
}

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
