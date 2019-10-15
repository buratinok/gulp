//подключаем модули галпа
const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const plugins = require('gulp-load-plugins');
const autoprefixer = require('autoprefixer');
const postcssPresetEnv = require('postcss-preset-env');
const del = require('del');
const fs = require('fs');
const yaml = require('js-yaml');
const yargs = require('yargs');
const named = require('vinyl-named');
const webpackStream = require('webpack-stream');
const webpack = require('webpack');
const imageminJpegRecompress = require('imagemin-jpeg-recompress');
const pngquant = require('imagemin-pngquant');
const panini = require('panini');
const Fiber = require('fibers');
const tildeImporter = require('node-sass-tilde-importer');

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
const PRODUCTION = !!(yargs.argv.production);

//подключение рабочих файлов
const htmlFiles = PATHS.html;
const scssFiles = PATHS.styles;
const jsFiles = PATHS.entrance;
const imgFiles = PATHS.img;

//страницы HTML
async function pages() {
    return gulp.src('src/pages/**/*.{html,hbs,handlebars}')
        .pipe(panini({
            root: 'src/pages/',
            layouts: 'src/layouts/',
            partials: 'src/partials/',
            data: 'src/data/',
            helpers: 'src/helpers/'
        }))
        .pipe(gulp.dest(PATHS.dist))
}

function resetPages(done) {
    panini.refresh();
    done();
}

//стили CSS
async function styles() {
    const css = await gulp.src(scssFiles)
    // .pipe($.sourcemaps.init())
        .pipe($.if(PRODUCTION, $.sass.sync({
            data: ({indentedSyntax: true}),
            outputStyle: 'compressed',
            importer: tildeImporter,
            sourceComments: true, //коменты
            fiber: Fiber
        }))
            .on('error', $.sass.logError))
        .pipe($.if(!PRODUCTION, $.sass.sync({
            data: ({indentedSyntax: true}),
            outputStyle: 'expanded',
            importer: tildeImporter,
            sourceMap: true,
            sourceMapContents: false,
            embedSourceMap: true,
            sourceComments: true, //коменты
            fiber: Fiber
        }))
            .on('error', $.sass.logError))
        .pipe($.base64Inline())
        .pipe($.concat('app.css'))
        .pipe($.postcss([
            postcssPresetEnv({
                stage: 2,
                browsers: COMPATIBILITY,
                autoprefixer: {grid: true, cascade: false},
                features: {'nesting-rules': true}
            })
        ]))

        .pipe($.if(!PRODUCTION, $.cleanCss({
            format: 'beautify',
            level: {
                1: {
                    all: true,
                    roundingPrecision: 'all=3,px=0'
                }
            }
        })))
        .pipe($.if(PRODUCTION, $.cleanCss({
            compatibility: '*',
            level: {
                1: {
                    all: false,
                    roundingPrecision: 'all=3,px=0'
                },
                2: {
                    all: true
                }
            }
        })))
        //.pipe($.if(!PRODUCTION, $.sourcemaps.write()))
        //.pipe($.if(PRODUCTION, $.rename({suffix: '.min'})))
        .pipe(gulp.dest(PATHS.build + 'css'))
        .pipe(browserSync.stream())
    return css
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
async function scripts() {
    const js = await gulp.src(jsFiles)
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
    return js
}

//обработка изображения
async function images() {
    const imgmin = await gulp.src(imgFiles)
        .pipe($.if(PRODUCTION, $.imagemin([
                $.imagemin.gifsicle({interlaced: true}),
                $.imagemin.jpegtran({progressive: true}),
                imageminJpegRecompress({
                    loops: 5,
                    min: 70,
                    max: 75,
                    quality: 'medium'
                }),
                $.imagemin.optipng({optimizationLevel: 5}),
                $.imagemin.svgo({
                    plugins: [
                        {removeViewBox: true},
                        {cleanupIDs: false},
                        pngquant({quality: '65-70', speed: 5})
                    ]
                }),
            ], {
                verbose: true
            }))
        )
        .pipe(gulp.dest(PATHS.build + 'img'))
        .pipe(browserSync.stream())
    return imgmin
}

//очистка
async function clean() {
    const cleanimg = await del(['build/*'])
    return cleanimg
}

//запуск сервера
async function server(done) {
    const browser = await browserSync.init({
        server: PATHS.dist,
        port: PORT
    }, done);
    return browser
}

//наблюдение
function watch() {
    gulp.watch('src/pages/**/*.html').on('all', gulp.series(pages, reload));
    gulp.watch(htmlFiles).on('all', gulp.series(resetPages, pages, reload));
    gulp.watch(scssFiles).on('all', gulp.series(styles, reload));
    gulp.watch(jsFiles).on('all', gulp.series(scripts, reload));
    gulp.watch(imgFiles).on('all', gulp.series(images, reload));
    //gulp.watch('build/*.html').on("change", reload);
}

//таска html
gulp.task('pages', pages);

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
gulp.task('build', gulp.series(clean, gulp.parallel(pages, scripts, images), styles));
gulp.task('dev', gulp.series('build', 'server', 'watch'))

