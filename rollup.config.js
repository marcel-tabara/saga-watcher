import path from 'path'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'
import resolve from 'rollup-plugin-node-resolve'
import pkg from './package.json'

const SRC_DIR = path.resolve('src')

export default [
  {
    input: path.join(SRC_DIR, 'saga-watcher.js'),
    output: {
      name: 'saga-watcher',
      exports: 'named',
      file: pkg.browser,
      format: 'umd',
    },
    plugins: [json(), resolve(), commonjs()],
  },
  {
    input: path.join(SRC_DIR, 'saga-watcher.js'),
    output: [
      { file: pkg.main, format: 'cjs', exports: 'named' },
      { file: pkg.module, format: 'es' },
    ],
    plugins: [json(), resolve(), commonjs()],
  },
]
