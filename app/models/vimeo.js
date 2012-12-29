define([
  'underscore',
  'backbone'
], function( _, Backbone ){

  var API_BASE = 'http://vimeo.com/api/v2/video/';

  return Backbone.Model.extend({

    initialize: function( attributes, params ){
      this.parent = params.parent;

      if( !this.parent ){
        throw new Error('Requires a parent model');
      }

      this.parseUrl();

      this.fetch({
        dataType: 'jsonp'
      });
    },

    parseUrl: function(){
      var parts = /vimeo.com\/(\S+)/.exec( this.parent.get('url') );

      if( parts[1] ){
        this.set('id', parts[1]);
      }
    },

    url: function(){
      return API_BASE + this.get('id') +'.json';
    },

    parse: function(data){
      var ret = data[0];

      ret.artwork_url = ret.thumbnail_medium;

      return ret;
    }


  });

});

