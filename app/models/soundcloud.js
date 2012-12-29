define([
  'underscore',
  'backbone'
], function( _, Backbone ){

  var CLIENT_ID = '?client_id=ac5ef8ec404bffaca78104a838599d91';

  return Backbone.Model.extend({

    initialize: function( attributes, params ){
      this.parent = params.parent;

      if( !this.parent ){
        throw new Error('Requires a parent model');
      }

      this.fetch({
        dataType: 'jsonp'
      });
    },

    url: function(){
      return this.parent.get('url') +'.json'+ CLIENT_ID;
    }

  });

});

