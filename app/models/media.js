define([
  'underscore',
  'backbone',
  'popcorn-require'
], function(_, Backbone, Popcorn){

  return Backbone.Model.extend({

    initialize: function(){
      this.on('play', this.play);
    },

    play: function(){
      if( this.video && this.video.pop ){
        this.video.pop.play();
      }
    }

  });

});

