const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const projectDir = path.join(__dirname, '..');
const srcDir = path.join(projectDir, 'src');

module.exports = (env) => {
  return {
    entry: './src/sdk/index.js',
    output: {
      path: path.resolve(projectDir, './build/sdk'),
      filename: 'floo-3.0.0.js',
      libraryTarget: 'umd',
      globalObject: 'this'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /(node_modules|lib)/,
          loader: 'eslint-loader',
          options: {
            // eslint options (if necessary)
          }
        },
        {
          test: /\.js$/,
          exclude: /(node_modules|bower_components)/,
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      ]
    },
    plugins: [
      new CleanWebpackPlugin(['build'], {
        verbose: false,
        exclude: ['img'] //不删除img静态资源
      })
    ],
    devServer: {
      host: 'dev.lanyingim.com',
      port: '443',
      // open: true,//自动拉起浏览器
      hot: false, //热加载
      https: true,
      disableHostCheck: true,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    },

    resolve: {
      alias: {
        '@src': path.join(projectDir, 'src'),
        '@model': path.join(projectDir, 'src/sdk/model'),
        '@utils': path.join(projectDir, 'src/sdk/utils'),
        '@core': path.join(projectDir, 'src/sdk/core')
      }
    },

    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          extractComments: {
            condition: /^\**!|@preserve|@license|@cc_on/i,
            filename: (file, fileData) => {
              return file.replace(/\.(\w+)($|\?)/, '.$1.LICENSE$2');
            },
            banner: (licenseFile) => {
              return `License information can be found in ${licenseFile}`;
            }
          }
        })
      ]
    }
  };
};
