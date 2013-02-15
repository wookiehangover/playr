module.exports = function(grunt){

  grunt.initConfig({

    requirejs: {
      compile: {
        options: {
          mainConfigFile: 'app/config.js',
          out: 'assets/src/playr.js',
          name: 'config',
          wrap: false,
          optimize: 'uglify2'
        }
      }
    },

    less: {
      compile: {
        options: {
          paths: ['assets/less']
        },
        files: {
          'assets/src/playr.css': 'assets/less/playr.less'
        }
      }
    },

    concat: {
      'assets/src/playr.js': [
        'assets/js/vendor/almond.js',
        'assets/src/playr.js'
      ]
    },

    targethtml: {
      release: {
        files: {
          'index.html': 'app/templates/index.html'
        }
      },
      debug: {
        files: {
          'index.html': 'app/templates/index.html'
        }
      }
    },

    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: false,
        latedef: false,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true,
        node: true,
        jQuery: true,
        expr: true
      },
      globals: [
        'Modernizr','define', '$'
      ]
    }

  });

  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-targethtml');

  grunt.registerTask('default', ['jshint','requirejs','concat','less']);
};
