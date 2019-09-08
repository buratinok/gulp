//подключаем модули галпа
const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const plugins = require('gulp-load-plugins');
const autoprefixer = require('autoprefixer');
const postcssPresetEnv = require('postcss-preset-env');
const del = require('del');
const fs = require('fs');
const yaml = require('js-yaml');


const reload = browserSync.reload;
const $ = plugins();
$.sass.compiler = require('node-sass');
const {COMPATIBILITY, PORT, PATHS} = loadConfig();

function loadConfig(){
    let ymlFile = fs.readFileSync('config.yml','utf8');
    return yaml.load(ymlFile);
}

const htmlFiles = [
    '*.html'
]

const cssFiles = PATHS.styles;
const jsFiles = PATHS.entrance;
const imgFiles = PATHS.img;


//стили CSS
function styles() {
    return gulp.src(cssFiles)
        .pipe($.sass())
        .pipe($.base64Inline())
        .pipe($.concat('style.css'))
        .pipe($.postcss([
            postcssPresetEnv({
                stage: 2,
                browsers: COMPATIBILITY,
                autoprefixer: {grid: true, cascade: false},
                features: {'nesting-rules': true}
            })
        ]))
        .pipe($.cleanCss({
            level: 2
        }))
        .pipe($.rename({suffix: '.min'}))
        .pipe(gulp.dest(PATHS.build + 'css'))
        .pipe(browserSync.stream())
}

//срипты JS
function scripts() {
    return gulp.src(jsFiles)
        //merge
        .pipe($.concat('app.js'))
        //минификацыя
        .pipe($.uglify({
            //манипулирование именами переменных
            toplevel: true
        }))
        .pipe($.rename({suffix: '.min'}))
        .pipe(gulp.dest(PATHS.build + 'js'))
        .pipe(browserSync.stream())
}

//обработка изображения
function images() {
    return gulp.src(imgFiles)
        .pipe($.imagemin({
            verbose: true,
            interlaced: true,
            progressive: true,
            optimizationLevel: 5,
            svgoPlugins : [
                {
                    removeViewBox : true
                }
            ]
        }))
        .pipe(gulp.dest(PATHS.build + 'img'))
        .pipe(browserSync.stream())
}

//очистка
function clean() {
    return del(['build/*'])
}
//запуск сервера
function server(done) {
    browserSync.init({
        server: {
            baseDir: PATHS.dist,
        }, port: PORT
    },done);
}

//наблюдение
function watch() {
    gulp.watch(cssFiles).on('all', gulp.series(styles, reload));
    gulp.watch(jsFiles ).on('all', gulp.series(scripts, reload));
    gulp.watch(imgFiles).on('all', gulp.series(images, reload));
    gulp.watch(htmlFiles).on("change", reload);
}


//таска css
gulp.task('styles', styles);

//таска js
gulp.task('scripts', scripts);

//таска img
gulp.task('images', images);

//таска clean
gulp.task('clean', clean);

//таск server
gulp.task('server', server);

//таск watch
gulp.task('watch', watch);

//таск build
gulp.task('build', gulp.series(clean, gulp.parallel(styles, scripts, images)));
gulp.task('dev', gulp.series('build', 'server', 'watch'))

