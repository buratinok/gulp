//подключаем модули галпа
const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const plugins = require('gulp-load-plugins');
const autoprefixer = require('autoprefixer');
const postcssPresetEnv = require('postcss-preset-env');

const $ = plugins();

//scss.compiler = require('node-scss');

const cssFiles = [
    './src/scss/**/*.scss'
]
const jsFiles = [
    './src/js/*.js'
]

//стили CSS
function styles() {
    return gulp.src(cssFiles)
        .pipe($.sass())
        .pipe($.base64Inline())
        .pipe($.concat('style.css'))
        .pipe($.postcss([
            postcssPresetEnv({
                stage: 2,
                browsers: ['last 2 versions', 'ie >= 9', 'android >= 4.4', 'ios >= 7'],
                autoprefixer: {grid: true, cascade: false},
                features: {'nesting-rules': true}
            })
        ]))
        .pipe($.cleanCss({
            level: 2
        }))
        .pipe($.rename({suffix: '.min'}))
        .pipe(gulp.dest('./build/css'))
}

//стили JS
function scripts() {

}

//очистка
function clean() {

}

//наблюдение
function watch() {
    browserSync.init({
        server: {
            baseDir: "./"
        }
    });
    gulp.watch('./scss/**/*.scss', styles);
}

//таска css
gulp.task('styles', styles);

//таска js
gulp.task('scripts', scripts);

//таска clean
gulp.task('clean', clean);

//таск watch
gulp.task('watch', watch);

//таск build
gulp.task('build', gulp.series(clean, gulp.parallel(styles, scripts)));
gulp.task('dev', gulp.series('build', 'watch'))

