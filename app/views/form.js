define([
  'underscore',
  'backbone',
  'plugins/jquery.deparam'
], function(_, Backbone){

  return Backbone.View.extend({
    initialize: function(){
      if( !this.collection ){
        throw new Error('Requires a collection');
      }
    },

    el: $('#add-video'),

    events: {
      "submit form": "addVideo"
    },

    addVideo: function(e){

      var data = $.deparam( this.$('form').serialize() );

      this.collection.add( data );

      return false;
    }
  });

});

