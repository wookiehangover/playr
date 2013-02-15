require.config({
  deps: ['test/main'],

  baseUrl: '../app',

  paths: {
    vendor: '../assets/js/vendor',
    plugins: '../assets/js/plugins',
    popcorn: '../assets/js/vendor/popcorn',

    backbone: '../assets/js/vendor/backbone',
    underscore: '../assets/js/vendor/lodash.min',

    tpl: '../assets/js/plugins/tpl',
    text: "../assets/js/plugins/text",
    json: "../assets/js/plugins/json",

    test: "../test"
  },

  shim: {
    backbone: {
      exports: 'Backbone',
      deps: ['underscore']
    },

    'plugins/jquery.deparam': [],

    'popcorn/popcorn-complete.min': {
      exports: 'Popcorn'
    }
  }
});
