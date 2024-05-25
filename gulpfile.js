import { src, dest, watch, series, parallel } from 'gulp';
import gulpSass from 'gulp-sass';
import * as dartSass from 'sass';
import autoprefixer from 'gulp-autoprefixer';
import cleanCss from 'gulp-clean-css';
import terser from 'gulp-terser';
import browserSync from 'browser-sync';
import babel from 'gulp-babel';
import concat from 'gulp-concat';
import plumber from 'gulp-plumber';
import eslint from 'gulp-eslint';
import clean from 'gulp-clean';
import { createRequire } from 'module';
import htmlmin from 'gulp-htmlmin';
import fileInclude from 'gulp-file-include';

const require = createRequire(import.meta.url);
const gulp = require('gulp');

const sass = gulpSass(dartSass);
const bs = browserSync.create();

// Compile, prefix, and minify SCSS
function compilescss() {
  return src('src/scss/*.scss')
    .pipe(plumber())
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({ overrideBrowserslist: ['last 2 versions'], cascade: false }))
    .pipe(cleanCss())
    .pipe(dest('dist/css'))
    .pipe(bs.stream());
}

// Copy images to dist directory
function copyImages() {
  return src('src/images/**/*.{jpg,png,svg}')
    .pipe(dest('dist/images'));
}

// Concatenate JavaScript files
function concatJs() {
  return src('src/js/*.js')
    .pipe(concat('all.js'))
    .pipe(dest('dist/js'))
    .pipe(bs.stream());
}

// Minify JavaScript with Babel
function jsmin() {
  return src('src/js/*.js')
    .pipe(plumber())
    .pipe(babel({ presets: ['@babel/env'] }))
    .pipe(terser())
    .pipe(dest('dist/js'))
    .pipe(bs.stream());
}

// TypeScript to JavaScript transpiling and minifying
function tsc() {
  return src('src/js/*.ts')
    .pipe(plumber())
    .pipe(babel({ presets: ['@babel/preset-env', '@babel/preset-typescript'] }))
    .pipe(terser())
    .pipe(dest('dist/js'))
    .pipe(bs.stream());
}

// Linting JavaScript
function eslintTask() {
  return src('src/js/*.js')
    .pipe(eslint({ fix: true }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
}

// HTML task
function html() {
  return src('src/**/*.html')
    .pipe(fileInclude({
      prefix: '@@',
      basepath: '@file'
    }))
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(dest('dist'))
    .pipe(bs.stream());
}

// BrowserSync to serve the project and reload on changes
function serve() {
  bs.init({
    server: {
      baseDir: './dist',
    },
    startPath: 'index.html',
  });

  watch('src/scss/**/*.scss', compilescss);
  watch('src/js/*.js', series(eslintTask, concatJs, jsmin));
  watch('src/js/*.ts', tsc);
  watch('src/images/**/*.{jpg,png,svg}', copyImages);
  watch('src/**/*.html', html);
  watch('dist/*.html').on('change', bs.reload);
}

// Cleaning the output directory
function cleanDist() {
  return src('dist', { read: false, allowEmpty: true })
    .pipe(clean());
}

// Default Gulp task
export default series(
  cleanDist,
  parallel(compilescss, series(eslintTask, concatJs, jsmin), tsc, copyImages, html),
  serve
);
