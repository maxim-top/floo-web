import resolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import builtins from 'rollup-plugin-node-builtins';
import path from 'path';

const projectDir = path.join(__dirname, '..');
const srcDir = path.join(projectDir, 'src/sdk');
const buildDir = path.join(projectDir, 'build/sdk');
// const dependencies = Object.keys(require('../package.json').dependencies);

export default [
  {
    input: path.resolve(srcDir, 'index.js'),
    output: [
      {
        file: path.resolve(buildDir, 'floo-2.0.0.u.js'),
        name: 'flooim',
        format: 'umd',
        sourcemap: false,
        globals: {
          'socket.io-client': 'io',
          axios: 'axios',
          long: 'Long',
          'query-string': 'queryString',
          'protobufjs/light': '$protobuf',
          bufferutil: 'bufferutil',
          'utf-8-validate': 'utf8Validate'
        }
      },
      {
        file: path.resolve(buildDir, 'floo-2.0.0.c.js'),
        format: 'cjs'
      },
      {
        file: path.resolve(buildDir, 'floo-2.0.0.e.js'),
        format: 'es'
      }
    ],
    // external: dependencies,
    onwarn: function (warning, warn) {
      // suppress eval warnings
      if (warning.code === 'EVAL' || (warning.code === 'CIRCULAR_DEPENDENCY' && !warning.importer.indexOf(path.normalize('node_modules/')))) {
        return;
      }
      warn(warning);
    },
    plugins: [
      resolve({ preferBuiltins: false }),
      cjs({
        // include: /node_modules/,
        namedExports: {
          'process/index.js': ['nextTick'],
          'events/events.js': ['EventEmitter'],
          'buffer/index.js': ['isBuffer'],
          'axios/index.js': ['defaults', 'interceptors'],
          'protobufjs/light.js': ['roots', 'Root']
        }
      }),
      json(),
      builtins()
    ]
  }
];
