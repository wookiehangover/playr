define([
  'underscore',
  'backbone',
  'views/playlist/playlist',
  'views/playlist/welcome',
  'views/video/video',
  'views/form',
  'collections/media',
  'router'
], function(_, Backbone, Playlist, WelcomeView, Video, Form, MediaCollection, Router){

  var Playr = Backbone.View.extend({
    el: $('body'),

    initialize: function(){
      this.collection = new MediaCollection();

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

      this.focusAdd();
    },

    events: {
      'click': 'focusAdd'
    },

    playing: function(){
      this.$el.addClass('playing');
    },

    pause: function(){
      this.$el.removeClass('playing');
    },

    focusAdd: function(){
      setTimeout(_.bind(function(){
        this.$('textarea').select();
      }, this), 200);
    }
  });

  return Playr;

});
