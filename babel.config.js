const path = require('path');

// let projectDir = path.join(__dirname, '.');
module.exports = {
  presets: ['@vue/app', { sourceType: 'unambiguous' }],
  plugins: [
    [
      'component',
      {
        libraryName: 'element-ui',
        styleLibraryName: 'theme-chalk'
      }
    ],
    [
      'module-resolver',
      {
        alias: {
          vue: path.join('vue', 'dist', 'vue.js'),
          '/': path.resolve(__dirname, '/'),
          '@src': path.resolve(__dirname, 'src'),
          '@proj': path.resolve(__dirname),
          components: path.resolve(__dirname, 'src/components/'),
          models: path.resolve(__dirname, 'src/models/'),
          services: path.resolve(__dirname, 'src/services/'),
          utils: path.resolve(__dirname, 'src/utils/')
        },
        extensions: ['', '.js', '.json', '.vue', '.scss', '.css']
      }
    ]
  ]
};
