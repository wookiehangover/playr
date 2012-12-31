define([
  'underscore',
  'backbone'
], function(_, Backbone){

  var BASE_URL = 'http://playr.dev:3000/playlists';

  return Backbone.Model.extend({

    initialize: function(attributes, params){
      this.parent = params.parent;

      if( !this.parent ){
        throw new Error('Requires a parent model');
      }
    },

    url: function(){
      var url = BASE_URL;

      if( this.id ){
        url += '/'+ this.id;
      }

      return url;
    },

    sync: function(method, model, options){
      var settings = _.defaults(options, {
        xhrFields: {
          withCredentials: true
        }
      });
      return Backbone.sync(method, model, options);
    },

    toJSON: function(){
      var data = _.clone(this.attributes);

      data.items_attributes = this.parent.toJSON();

      return { playlist: data };
    },

    parse: function(res){
      var ret = _.omit( res, 'items' );

      if( res.items ){
        this.parent.update( res.items );
      }

      return ret;
    }

  });

});
