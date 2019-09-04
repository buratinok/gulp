//подключаем модули галпа
const gulp = require('gulp');

const cssFiles = [
    './src/css/*.css'
]
const jsFiles = [
    './src/js/*.js'
]

//стили CSS
function styles(){

}

//стили JS
function scripts(){

}

//очистка
function clean(){

}

//наблюдение
function watch(){
    browserSync.init({
        server: {
            baseDir: "./"
        }
    });
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
gulp.task('build', gulp.series(clean, gulp.parallel(styles,scripts)));
gulp.task('dev', gulp.series('build','watch'))

