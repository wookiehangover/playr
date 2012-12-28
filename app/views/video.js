define([
  'underscore',
  'backbone',
  'views/video-item'
], function(_, Backbone, VideoItem){

  return Backbone.View.extend({

    el: $('#video'),

    initialize: function(){
      if( !this.collection ){
        throw new Error('Requires a collection');
      }

      this.listenTo( this.collection, 'add', this.add);
    },

    add: function( model ){
      model.video = new VideoItem({ model: model, parent: this });
    },

    events: {
      'click [data-action]': 'controls'
    },

    controls: function(e){
      var action = $(e.currentTarget).data('action');

      if( this.active && this.active.pop[ action ] ){
        this.active.pop[action]();
      }

      if( action === 'next' ){
        this.collection.next();
      }
      return false;
    }

  });

});

