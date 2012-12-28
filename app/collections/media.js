define([
  'underscore',
  'backbone',
  'models/media'
], function(_, Backbone, MediaModel){

  return Backbone.Collection.extend({
    model: MediaModel,

    initialize: function(){
      this.on('next', function( model ){
        var current = this.indexOf( model );
        var next = current + 1 === this.length ? 0 : current + 1;
        this.at( next ).trigger('activate');
      }, this);
    }
  });

});
