define([
  'underscore',
  'backbone',
  'views/video-item',
  'views/video-controls'
], function(_, Backbone, VideoItem, Controls){

  return Backbone.View.extend({

    el: $('#video'),

    initialize: function(){
      if( !this.collection ){
        throw new Error('Requires a collection');
      }

      this.controls = new Controls({ parent: this });

      this.listenTo( this.collection, 'add', this.add);
      this.listenTo( this.collection, 'activated', this.update);
    },

    add: function( model ){
      model.video = new VideoItem({ model: model, parent: this });
    },

    update: function( model ){
      this.$el.removeClass().addClass( model.get('type') );
    }

  });

});

