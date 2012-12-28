require([
  'underscore',
  'backbone',
  'views/playlist',
  'views/video',
  'views/form',
  'collections/media'
], function(_, Backbone, Playlist, Video, Form, MediaCollection){

  var Playr = Backbone.View.extend({
    el: $('#main'),

    initialize: function(){
      this.media = new MediaCollection();

      var options = {
        collection: this.media
      };

      this.video    = new Video( options );
      this.form     = new Form( options );
      this.playlist = new Playlist( options );
    }
  });

  $(function(){
    window.Playr = new Playr();
  });


});
