const webpack = require('webpack');
const path = require('path');

const CleanWebpackPlugin = require('clean-webpack-plugin');
// const ExtractTextWebpackPlugin = require("extract-text-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const EncodingPlugin = require('webpack-encoding-plugin');

const projectDir = path.join(__dirname, '..');
module.exports = (env) => {
  return {
    entry: {
      vendors: ['vue', 'vuex', 'axios', 'lodash'],
      app: path.join(projectDir, 'src', 'main.js')
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
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }
      ]
    },

    plugins: [
      new CleanWebpackPlugin(['dist'], {
        root: projectDir
      }),

      new webpack.DefinePlugin({
        'process.env.NODE_ENV': '"production"'
      }),

      new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: '[id].css'
      }),

      new HtmlWebpackPlugin({
        template: path.join(projectDir, 'public', 'index.html'),
        filename: 'index.html',
        inject: 'body',
        minify: {
          removeComments: true,
          collapseWhitespace: true,
          removeAttributeQuotes: true
        },
        favicon: path.join(projectDir, 'public', 'favicon.ico')
      }),

      new EncodingPlugin({
        encoding: 'utf8'
      }),

      new webpack.ProvidePlugin({ adapter: ['webrtc-adapter', 'default'] })
    ],
    optimization: {
      splitChunks: {
        cacheGroups: {
          vendors: {
            name: 'vendors',
            chunks: 'initial',
            minChunks: 2
          },
          manifest: {
            name: 'manifest',
            chunks: 'initial',
            minChunks: 2
          }
        }
      },
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
