define([
  'underscore',
  'backbone',
  'views/playlist-item'
], function(_, Backbone, PlaylistItem){

  return Backbone.View.extend({
    el: $('#playlist'),

    initialize: function(params){
      if( !this.collection ){
        throw new Error('Requires a collection');
      }

      this.listenTo( this.collection, 'add', this.add);
    },

    add: function( model, collection ){
      model.view = new PlaylistItem({ model: model, parent: this });
    }
  });

});
