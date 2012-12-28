define([
  'underscore',
  'backbone',
  'models/media'
], function(_, Backbone, MediaModel){

  return Backbone.Collection.extend({
    model: MediaModel,

    initialize: function(){

    },

    next: function( model ){
      var current = model ? model : this.where({ active: true })[0];

      if( !current ){
        // there aren't any videos loaded yet
        return false;
      }
      var index = this.indexOf( current );
      var next = index + 1 === this.length ? 0 : index + 1;

      this.at( next ).trigger('activate', true);
    }
  });

});
