define(function(require, exports, module){

  var _               = require('underscore');
  var Backbone        = require('backbone');
  var User            = require('./models/user');
  var MediaCollection = require('./collections/media');
  var Playlist        = require('./views/playlist/playlist');
  var WelcomeView     = require('./views/playlist/welcome');
  var Video           = require('./views/video/video');
  var Form            = require('./views/form');
  var Router          = require('./router');

  var Playr = Backbone.View.extend({
    el: $('body'),

    initialize: function(){
      this.collection = new MediaCollection();
      this.user = new User();

      this.welcomeMessage = new WelcomeView();

      var options = {
        collection: this.collection
      };

      this.video    = new Video( options );
      this.form     = new Form( options );
      this.playlist = new Playlist( options );
      this.router = new Router({ app: this });

      this.listenTo( Backbone, 'playing', this.playing);
      this.listenTo( Backbone, 'pause', this.pause);
    },

    playing: function(){
      this.$el.addClass('playing');
    },

    pause: function(){
      this.$el.removeClass('playing');
    }
  });

  return Playr;

});
