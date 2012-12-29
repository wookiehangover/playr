require([
  'underscore',
  'backbone',
  'views/playlist',
  'views/video',
  'views/form',
  'collections/media'
], function(_, Backbone, Playlist, Video, Form, MediaCollection){

  var Playr = Backbone.View.extend({
    el: $('body'),

    initialize: function(){
      this.collection = new MediaCollection();

      var options = {
        collection: this.collection
      };

      this.video    = new Video( options );
      this.form     = new Form( options );
      this.playlist = new Playlist( options );

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

  $(function(){
    window.Playr = new Playr();
  });


});
