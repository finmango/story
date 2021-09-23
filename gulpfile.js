const gulp = require('gulp');
const pckg = require('./package.json');
const lesson = require('./lesson.json')

// Process arguments
const args = require('minimist')(process.argv.slice(1));
const env = args.env || 'development';


// Lint tasks

gulp.task('lint:html', function () {
    const htmlhint = require('gulp-htmlhint');
    return gulp.src(['src/**/*.html', '!src/**/*.tpl.html', '!src/**/*.frame.html'])
        .pipe(htmlhint())
        .pipe(htmlhint.reporter('fail'));
});

gulp.task('lint:js', function () {
    const jshint = require('gulp-jshint');
    return gulp.src(['src/**/*.js'])
        .pipe(jshint({ newcap: false, sub: true }))
        .pipe(jshint.reporter('fail'));
});

gulp.task('lint:all', gulp.series('lint:html', 'lint:js'));


// Clean tasks

gulp.task('clean', function () {
    const del = require('del');
    return del(['public/*']);
});


// Build tasks

gulp.task('build:css', function () {
    const merge = require('merge2');
    const concat = require('gulp-concat');
    const cssmin = require('gulp-clean-css');
    const rename = require('gulp-rename');
    const replace = require('gulp-replace');
    const mancha = require('gulp-mancha');

    const stream = gulp
        .src(['src/**/*.css'])
        .pipe(mancha({
            'theme-primary': pckg.vars.theme.primary,
            'theme-accent': pckg.vars.theme.accent,
            'theme-background': pckg.vars.theme.background,
            'theme-text-on-background': pckg.vars.theme['text-on-background']
        }));

    return merge(gulp.src(['node_modules/muicss/dist/css/mui.min.css']), stream)
        .pipe(replace('!important', ''))
        .pipe(concat('styles.css'))
        .pipe(cssmin())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('public/static'))
});

gulp.task('build:html', function () {
    const fs = require('fs')
    const mancha = require('gulp-mancha')

    const vars = Object.assign({},
        // Dynamically identify variables from package.json
        pckg.vars,
        // Colors from the theme defined in package.json
        {
            'theme-primary': pckg.vars.theme.primary,
            'theme-accent': pckg.vars.theme.accent,
            'theme-background': pckg.vars.theme.background,
            'theme-text-on-background': pckg.vars.theme['text-on-background']
        },
        // Add the name and description from the top-level package
        { name: pckg.displayName, description: pckg.description },
        // Add variables from context
        { env: env, year: new Date().getFullYear() },
        // Use variables from this lesson to populate fields
        { url: lesson.url, name: lesson.title }
    )

    // Perform rendering
    return gulp.src(['src/manifest.json', 'src/**/*.html', '!src/**/*.tpl.html'])
        .pipe(mancha(
            vars,
            {
                fs: fs,
                encodeHtmlAttrib: mancha.encodeHtmlAttrib,
                console: console,
                canonical: null
            },
            './src',
        )).pipe(gulp.dest('public'));
});

gulp.task('build:logo', function () {
    const jimp = require('gulp-jimp');
    const imagesizes = [64, 128, 512];
    return gulp.src('src/static/logo.png')
        .pipe(jimp(
            imagesizes.reduce(function (acc, size) {
                acc['-' + size] = { resize: { width: size } };
                return acc;
            }, {})
        ))
        .pipe(gulp.dest('public/static'));
});

gulp.task('build:all', gulp.series('build:css', 'build:logo', 'build:html'));


// Copy tasks

gulp.task('copy:static', function () {
    return gulp.src(['src/static/**/*'])
        .pipe(gulp.dest('public/static'));
});

gulp.task('copy:all', gulp.series('copy:static'));


// Minification tasks

gulp.task('minify:js', function () {
    const uglify = require('gulp-uglify');
    return gulp.src(['public/**/*.js', '!public/node_modules/**/*'])
        .pipe(uglify())
        .pipe(gulp.dest('public'));
});

gulp.task('minify:html', function () {
    const minify = require('gulp-minify-inline');
    return gulp.src(['public/**/*.html', '!public/node_modules/**/*'])
        .pipe(minify({ jsSelector: 'script[data-do-not-minify!=true]' }))
        .pipe(gulp.dest('public'));
});

gulp.task('minify:img', function () {
    const imagemin = require('gulp-imagemin');
    return gulp.src(['src/**/*.png', 'src/**/*.jpg', 'src/**/*.jpeg', 'src/**/*.gif'])
        .pipe(imagemin())
        .pipe(gulp.dest('public'));
});

gulp.task('minify:all', gulp.series('minify:js', 'minify:html', 'minify:img'));


// Validation tasks

gulp.task('amp:validate', function (callback) {
    // TODO: remove this early return once the following issue is fixed:
    // https://github.com/ampproject/amphtml/issues/30527
    return callback();

    const amp = require('gulp-amphtml-validator');
    return gulp.src(['public/**/*.html', '!public/**/*.frame.html', '!public/node_modules/**/*.html'])
        .pipe(amp.validate())
        .pipe(amp.format())
        .pipe(amp.failAfterError());
});


// Deploy tasks

gulp.task('firebase', function (callback) {
    const client = require('firebase-tools');
    return client.deploy({
        project: pckg.name,
        token: process.env.FIREBASE_TOKEN
    }).then(function () {
        return callback();
    }).catch(function (err) {
        console.log(err);
        return process.exit(1);
    });
});

// Used to make sure the process ends
gulp.task('exit', function (callback) {
    callback();
    process.exit(0);
});


// High level tasks

gulp.task('build:debug', gulp.series('lint:all', 'build:all', 'copy:all'));
gulp.task('build:prod', gulp.series('build:debug', 'minify:all', 'amp:validate'));
gulp.task('build', gulp.series('build:prod'));
gulp.task('default', gulp.series('build'));
gulp.task('deploy', gulp.series('firebase', 'exit'));
