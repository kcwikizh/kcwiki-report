var gulp = require('gulp'),
	watch = require('gulp-watch');
<<<<<<< HEAD
var destDir = '/Users/ivan_l/Library/Application Support/poi/plugins/node_modules/poi-plugin-kcwiki-report';
||||||| merged common ancestors
var destDir = '/Users/ivan_l/Library/Application\ Support/poi/plugins/node_modules/poi-plugin-kcwiki-report';
=======
require('dotenv').config()
var destDir = process.env.PLUGIN_RUN_DIR
>>>>>>> ed62302e94ae3046f947391e3b164af6987ca0a3

// Sync files between git repo and local poi plugin directory
gulp.task('watch', function() {
	watch('**/*.es', function() {
		gulp.src('**/*.es')
			.pipe(watch('**/*.es'))
			.pipe(gulp.dest(destDir))
	});
});