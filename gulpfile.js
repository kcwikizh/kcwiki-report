var gulp = require('gulp'),
	watch = require('gulp-watch');
require('dotenv').config()
var destDir = process.env.PLUGIN_RUN_DIR

// Sync files between git repo and local poi plugin directory
gulp.task('watch', function() {
	watch('**/*.es', function() {
		gulp.src('**/*.es')
			.pipe(watch('**/*.es'))
			.pipe(gulp.dest(destDir))
	});
});