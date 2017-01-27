module.exports = function(config) {
    config.set({
        basePath: '',
        plugins: [
            'karma-mocha',
            'karma-chai',
            'karma-phantomjs-launcher'
        ],
        frameworks: ['mocha', 'chai'],
        files: [
            'dist/boid.js',
            'test/**/*.spec.js'
        ],
        exclude: [

        ],
        // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
        reporters: ['progress'],
        port: 9876,
        colors: true,
        /* possible values:
        config.LOG_DISABLE
        config.LOG_ERROR
        config.LOG_WARN
        config.LOG_INFO
        config.LOG_DEBUG*/
        logLevel: config.LOG_INFO,
        autoWatch: true,
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera (has to be installed with `npm install karma-opera-launcher`)
        // - Safari (only Mac; has to be installed with `npm install karma-safari-launcher`)
        // - PhantomJS
        // - IE (only Windows; has to be installed with `npm install karma-ie-launcher`)
        browsers: [
            'PhantomJS'
        ],
        captureTimeout: 60000,
        singleRun: false
    });
};
