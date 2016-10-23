var gulp = require('gulp'),
	watch = require('gulp-watch');
var destDir = '/Users/ivan_l/Library/Application Support/poi/plugins/node_modules/poi-plugin-kcwiki-report';

// Sync files between git repo and local poi plugin directory
gulp.task('watch', function() {
	watch('**/*.cjsx', function() {
		gulp.src('**/*.cjsx')
			.pipe(watch('**/*.cjsx'))
			.pipe(gulp.dest(destDir))
	});
});
