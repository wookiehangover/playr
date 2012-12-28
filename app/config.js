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

    'popcorn/popcorn': {
      exports: 'Popcorn'
    },
    'popcorn/popcorn.modules': {
      exports: 'Popcorn',
      deps: ['popcorn/popcorn']
    },
    'popcorn/popcorn.parsers': {
      exports: 'Popcorn',
      deps: ['popcorn/popcorn', 'popcorn/popcorn.modules']
    },
    'popcorn/popcorn.wrappers': {
      exports: 'Popcorn',
      deps: ['popcorn/popcorn']
    },
    'popcorn/popcorn.effects': {
      exports: 'Popcorn',
      deps: ['popcorn/popcorn']
    },
    'popcorn/popcorn.players': {
      exports: 'Popcorn',
      deps: ['popcorn/popcorn']
    }
  }

});
