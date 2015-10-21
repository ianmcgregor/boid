'use strict';

var browserify = require('browserify'),
    browserSync = require('browser-sync'),
    buffer = require('vinyl-buffer'),
    chalk = require('chalk'),
    gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    rename = require('gulp-rename'),
    source = require('vinyl-source-stream'),
    strip = require('gulp-strip-debug'),
    uglify = require('gulp-uglify'),
    watchify = require('watchify');

var standaloneName = 'Boid',
    entryFileName = 'boid.js',
    bundleFileName = 'boid.js';

// log
function logError(msg) {
  console.log(chalk.bold.red('[ERROR] ' + msg.toString()));
}

// bundler
var bundler = watchify(browserify({
  entries: ['src/' + entryFileName],
  standalone: standaloneName,
  debug: true,
  cache: {},
  packageCache: {}
}), {poll: true});

function bundle() {
  return bundler
    .bundle()
    .on('error', logError)
    .pipe(source(bundleFileName))
    .pipe(buffer())
    .pipe(gulp.dest('./dist/'))
    .pipe(rename({ extname: '.min.js' }))
    .pipe(uglify())
    .pipe(strip())
    .pipe(gulp.dest('./dist/'));
}

bundler.on('update', bundle); // on any dep update, runs the bundler
gulp.task('bundle', ['jshint'], bundle);

function bundleRelease(minify) {
  var bundler = browserify({
    entries: ['./src/' + entryFileName],
    standalone: standaloneName,
    debug: !minify
  });

  return bundler
    .bundle()
    .on('error', logError)
    .pipe(source(bundleFileName))
    .pipe(buffer())
    .pipe(gulp.dest('./dist/'))
    .pipe(rename({ extname: '.min.js' }))
    .pipe(uglify())
    .pipe(strip())
    .pipe(gulp.dest('./dist/'));
}

gulp.task('release', bundleRelease);

// connect browsers
gulp.task('connect', function() {
  browserSync.init({
    server: {
      baseDir: ['./', 'examples']
    },
    files: [
      'dist/*',
      'examples/**/*'
    ],
    reloadDebounce: 500
  });
});

// reload browsers
gulp.task('reload', function() {
  browserSync.reload();
});

// js hint
gulp.task('jshint', function() {
  return gulp.src([
      './gulpfile.js',
      'src/**/*.js',
      'test/**/*.js',
      'examples/**/*.js',
      '!examples/js/highlight.pack.js'
  ])
  .pipe(jshint())
  .pipe(jshint.reporter('jshint-stylish'));
});

// watch
gulp.task('watch', function() {
  gulp.watch('test/**/*.js', ['jshint']);
  gulp.watch('examples/**/*.js', ['jshint']);
  gulp.watch('src/**/*.js', ['bundle']);
});

// default
gulp.task('default', ['connect', 'watch', 'bundle']);
