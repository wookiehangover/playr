define([
  'underscore',
  'backbone'
], function( _, Backbone ){

  var API_BASE = 'https://gdata.youtube.com/feeds/api/videos/';

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
      var url = this.parent.get('url');
      var qs = $.deparam( url.split('?')[1] );

      if( qs.v ){
        this.set('id', qs.v);
      }
    },

    url: function(){
      return API_BASE + this.get('id') +'?v=2&alt=json';
    },

    parse: function(data){

      var ret = {
        title: data.entry.title.$t
      };

      if( data.entry.media$group.media$thumbnail ){
        ret.artwork_url = data.entry.media$group.media$thumbnail[0].url;
      }

      return ret;
    }


  });

});
