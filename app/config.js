require.config({

  deps: ['main'],

  paths: {
    vendor: '../assets/js/vendor',
    plugins: '../assets/js/plugins',
    popcorn: '../assets/js/vendor/popcorn',

    backbone: '../assets/js/vendor/backbone',
    underscore: '../assets/js/vendor/lodash.min',

    tpl: '../assets/js/plugins/tpl',
    text: "../assets/js/plugins/text",
    json: "../assets/js/plugins/json"
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

define(function(require, exports, module){

  module.exports = {
    BASE_URL: 'http://api.playr.dev:3000'
  };

});
