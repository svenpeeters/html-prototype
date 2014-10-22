'use strict';

/*  ------------------------------------------------------------------------  *\
    REQUIREMENTS
\*  ------------------------------------------------------------------------  */

var
    _                   = require('lodash'),
    browserSync         = require('browser-sync'),
    chalk               = require('chalk'),
    cp                  = require('child_process'),
    del                 = require('del'),
    flags               = require('minimist')(process.argv.slice(2)),
    fs                  = require('fs'),
    paths               = require('path'),
    prompt              = require('inquirer').prompt,
    reload              = browserSync.reload,
    sequence            = require('run-sequence'),
    stylish             = require('jshint-stylish'),
    streamqueue         = require('streamqueue')
;


////////////////////////////////////////////////////////////////////////////////


var
    gulp            = require('gulp'),
    plugins         = require('gulp-load-plugins')({
        config: paths.join(__dirname, 'package.json')
    })
;





/*  ------------------------------------------------------------------------  *\
    VARIABLES
\*  ------------------------------------------------------------------------  */

var
    cwd             = process.cwd(),
    config          = null,
    server          = {}
;





/*  ------------------------------------------------------------------------  *\
    FLAGS
\*  ------------------------------------------------------------------------  */

var
    isProduction    = ( flags.production || flags.p || flags.prod ) || false,
    isServe         = ( flags.serve || flags.s ) || false
;





/*  ------------------------------------------------------------------------  *\
    CLEAN TASKS
\*  ------------------------------------------------------------------------  */

gulp.task('clean:html', function (cb) {
    del([config.path.export.html], cb);
});

gulp.task('clean:css', function (cb) {
    del([config.path.export.css], cb);
});

gulp.task('clean:fonts', function (cb) {
    del([config.path.export.fonts], cb);
});

gulp.task('clean:img', function (cb) {
    del([config.path.export.img], cb);
});

gulp.task('clean:js', function (cb) {
    del([config.path.export.js], cb);
});

gulp.task('clean:all', ['clean:html', 'clean:css', 'clean:fonts', 'clean:img', 'clean:js']);





/*  ------------------------------------------------------------------------  *\
    HTML
\*  ------------------------------------------------------------------------  */

gulp.task('compile:html', function (cb) {
    return gulp.src(config.path.templates + '**/*.html')
        .pipe(plugins.run('jekyll build --destination ' + (isProduction ? config.path.export.root : config.path.export.html)))
    ;
});

gulp.task('rebuild:html', ['compile:html'], function (cb) {
    reload();
    cb(null);
});




/*  ------------------------------------------------------------------------  *\
    CSS
\*  ------------------------------------------------------------------------  */

gulp.task('compile:css', function (cb) {
    return gulp.src(config.path.assets.css + '/**/*.scss')
        .pipe(plugins.rubySass())
        .pipe(plugins.combineMediaQueries())
        .pipe(plugins.autoprefixer({ browsers: ['last 2 versions'] }))
        .pipe(plugins.if(isProduction, plugins.minifyCss({ keepBreaks:true })))
        .pipe(gulp.dest(config.path.export.css))
        .pipe(plugins.if(config.server.status, reload({ stream: true })))
    ;
});





/*  ------------------------------------------------------------------------  *\
    JS
\*  ------------------------------------------------------------------------  */

gulp.task('hint:js', function (cb) {
    return gulp.src([
            config.path.assets.js + '/**/*.js'
        ])
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter(require('jshint-stylish')))
    ;
});

gulp.task('compile:js', ['hint:js'], function (cb) {
    return gulp.src(_.union(
        _.toArray(config.vendors.js),
        [
            config.path.assets.js + '/*.js'
        ]))
        .pipe(plugins.concat('app.js'))
        .pipe(plugins.if(isProduction, plugins.uglify()))
        .pipe(gulp.dest(config.path.export.js))
        .pipe(plugins.if(config.server.status, reload({ stream: true })))
    ;
});





/*  ------------------------------------------------------------------------  *\
    IMAGES
\*  ------------------------------------------------------------------------  */

gulp.task('compile:img', function (cb) {
    return gulp.src(config.path.assets.img + '/**/*.{png,gif,jpeg,jpg,webp,svg}')
        .pipe(plugins.changed(config.path.export.img))
        .pipe(plugins.imagemin({
            optimizationLevel: 3,
            progressive: true,
            interlaced: true,
            svgoPlugins: [{removeViewBox: false}],
        }))
        .pipe(gulp.dest(config.path.export.img))
        .pipe(plugins.if(server.status, browserSync.reload({stream:true})))
    ;

    cb(null);
});





/*  ------------------------------------------------------------------------  *\
    BROWSER SYNC
\*  ------------------------------------------------------------------------  */

gulp.task('browsersync', function (cb) {
    browserSync({
        server: {
            baseDir: config.path.export.root,
            index: 'html/index.html'
        }
    }, function(err, data) {

        if (err !== null) {
            console.log(chalk.red('✘  Setting up a local server failed... Please try again. Aborting.'));
            console.log(chalk.red(err));
            process.exit(0);
        }

        server.external = data.options.external;
        server.port = data.options.port;
        server.status = true
    });

    cb(null);
});





/*  ------------------------------------------------------------------------  *\
    SERVER
\*  ------------------------------------------------------------------------  */

gulp.task('server', ['browsersync'], function (cb) {

    // HTML
    gulp.watch(config.path.templates + '/**/*', ['clean:html', 'rebuild:html']);

    // SCSS
    gulp.watch(config.path.assets.css + '/**/*', ['clean:css', 'compile:css']);

    // JS
    gulp.watch(config.path.assets.js + '/**/*', ['clean:js', 'compile:js']);

    // IMG
    gulp.watch(config.path.assets.img + '/**/*', ['compile:img']);

});





/*  ------------------------------------------------------------------------  *\
    DEFAULT
\*  ------------------------------------------------------------------------  */

gulp.task('default', function (cb) {

    console.log(chalk.yellow('----------------------------------------------'));
    console.log(chalk.yellow('Hello Developer!'));
    console.log(chalk.yellow('----------------------------------------------'));

    // Load the config.json file
    fs.readFile('config.json', 'utf8', function (err, data) {
        console.log(chalk.grey('☞  Loading config.json...'));

        if (err) {
            console.log(chalk.red.inverse('✘  Cannot find config.json.'));
            process.exit(0);
        }

        try {
            config = JSON.parse(data);
            server = config.server;

            console.log(chalk.green('✔  config.json successfully loaded'));
            cb(null);

            gulp.start('build');
        } catch (err) {
            console.log(chalk.red.inverse('✘  The config.json file is not valid json.'));
            process.exit(0);
        }
    });
});





/*  ------------------------------------------------------------------------  *\
    BUILD
\*  ------------------------------------------------------------------------  */

gulp.task('build', function (cb) {
    console.log(chalk.grey('☞  Building ' + (isProduction ? 'production' : 'dev') + ' version...'));

    if (isServe) {
        sequence(
            'clean:all',
            'compile:html',
            [
                'compile:css',
                'compile:js',
                'compile:img'
            ],
            'server',
            function () {
                console.log(chalk.green('✔  Build complete'));
                cb(null);
            }
        )
    } else {
        sequence(
            'clean:all',
            'compile:html',
            [
                'compile:css',
                'compile:js',
                'compile:img'
            ],
            function () {
                console.log(chalk.green('✔  Build complete'));
                cb(null);
            }
        )
    }
});
