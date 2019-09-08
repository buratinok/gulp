//подключаем модули галпа
const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const plugins = require('gulp-load-plugins');
const autoprefixer = require('autoprefixer');
const postcssPresetEnv = require('postcss-preset-env');
const del = require('del');
const fs = require('fs');
const yaml = require('js-yaml');
const yargs = require('yargs')
const named = require('vinyl-named')
const webpackStream = require('webpack-stream');
const webpack = require('webpack')

//релоадер browserSync
const reload = browserSync.reload;

//плагины gulp подключение $
const $ = plugins();

//компилятор node-sass
$.sass.compiler = require('node-sass');

//подключение чтение config.yml
const {COMPATIBILITY, PORT, PATHS} = loadConfig();

function loadConfig() {
    let ymlFile = fs.readFileSync('config.yml', 'utf8');
    return yaml.load(ymlFile);
}

//проверка флага --production
const PRODUCTION = !!(yargs.argv.production)

//подключение рабочих файлов
const htmlFiles = [
    '*.html'
]
const cssFiles = PATHS.styles;
const jsFiles = PATHS.entrance;
const imgFiles = PATHS.img;


//стили CSS
function styles() {
    return gulp.src(cssFiles)
        .pipe($.sourcemaps.init())
        .pipe($.sass()
            .on('error', $.sass.logError))
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

        .pipe($.if(PRODUCTION, $.cleanCss({ level: 2})))
        .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
        //.pipe($.if(PRODUCTION, $.rename({suffix: '.min'})))
        .pipe(gulp.dest(PATHS.build + 'css'))
        .pipe(browserSync.stream())
}

//конфигурацыя webpack
let webpackConfig = {
    mode: (PRODUCTION ? 'production' : 'development'),
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ["@babel/preset-env"],
                        compact: false
                    }

                }
            }
        ]
    },
    devtool: !PRODUCTION && 'source-map'
}

//скрипты JS
function scripts() {
    return gulp.src(jsFiles)
        .pipe(named())
        .pipe($.sourcemaps.init())
        .pipe(webpackStream(webpackConfig, webpack))
        .pipe($.if(PRODUCTION, $.uglify({toplevel: true})
                .on('error', e => {
                    console.log();
                })
        ))
        .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
        //.pipe($.if(PRODUCTION, $.rename({suffix: '.min'})))
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
            svgoPlugins: [
                {
                    removeViewBox: true
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
    }, done);
}

//наблюдение
function watch() {
    gulp.watch(cssFiles).on('all', gulp.series(styles, reload));
    gulp.watch(jsFiles).on('all', gulp.series(scripts, reload));
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

