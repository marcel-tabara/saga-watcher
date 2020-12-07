import fs from 'fs'
import path from 'path'
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'
import resolve from 'rollup-plugin-node-resolve'
import stripBanner from 'rollup-plugin-strip-banner'
import { minify } from 'uglify-js'
import saveLicense from 'uglify-save-license'
import pkg from './package.json'

const SRC_DIR = path.resolve('src')
const DIST_DIR = path.resolve('dist')

export default [
  {
    input: path.join(SRC_DIR, 'saga-watcher.js'),
    output: {
      name: 'sagaWatcher',
      exports: 'named',
      file: pkg.browser,
      format: 'umd',
    },
    plugins: [
      json(),
      stripBanner(),
      babel({
        presets: ['@babel/preset-env'],
        exclude: '**/node_modules/**',
        babelrc: false,
      }),
      resolve(),
      commonjs(),
      {
        name: 'uglify',
        transformBundle(code) {
          const result = minify(code, {
            fromString: true,
            mangle: { toplevel: true },
            output: { max_line_len: 2048, comments: saveLicense },
            compress: { comparisons: true, pure_getters: true, unsafe: true },
          })

          if (!fs.existsSync(DIST_DIR)) {
            fs.mkdirSync(DIST_DIR)
          }

          fs.writeFileSync(
            path.join(DIST_DIR, 'saga-watcher.min.js'),
            result.code,
            'utf8'
          )
        },
      },
    ],
  },
  {
    input: path.join(SRC_DIR, 'saga-watcher.js'),
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
    ],
    plugins: [
      json(),
      stripBanner(),
      babel({
        presets: ['@babel/preset-env'],
        exclude: '**/node_modules/**',
        babelrc: false,
      }),
      resolve(),
      commonjs(),
      {
        name: 'uglify',
        transformBundle(code) {
          const result = minify(code, {
            fromString: true,
            mangle: { toplevel: true },
            output: { max_line_len: 2048, comments: saveLicense },
            compress: { comparisons: true, pure_getters: true, unsafe: true },
          })

          if (!fs.existsSync(DIST_DIR)) {
            fs.mkdirSync(DIST_DIR)
          }

          fs.writeFileSync(
            path.join(DIST_DIR, 'saga-watcher.min.js'),
            result.code,
            'utf8'
          )
        },
      },
    ],
  },
]
