const webpack = require('webpack');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

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
        }
      ]
    },
    plugins: [
      new webpack.HotModuleReplacementPlugin({}),
      new CleanWebpackPlugin(['dist'], {
        root: projectDir
      }),

      new webpack.DefinePlugin({
        'process.env.NODE_ENV': '"development"'
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

      new webpack.HotModuleReplacementPlugin()
    ],

    devServer: {
      port: 443,
      // inline: true,
      hot: true,
      open: true,
      host: 'dev.maximtop.com',
      disableHostCheck: true,
      https: true
      // proxy: {
      //   "**/*.do": {
      //     target: devConfig.apiUrl,
      //     onProxyReq (proxyReq) {
      //       proxyReq.setHeader("host", url.parse(devConfig.apiUrl).host);
      //     },
      //   },
      // },
    },

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
      }
    },

    stats: 'normal'
  };
};
