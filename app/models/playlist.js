define(function(require, exports, module){

  var _        = require('underscore');
  var Backbone = require('backbone');
  var config   = require('config');

  var BASE_URL = config.BASE_URL +'/playlists';

  return Backbone.Model.extend({

    initialize: function(attributes, params){
      this.parent = params.parent;

      if( !this.parent ){
        throw new Error('Requires a parent collection');
      }

      this.listenTo( this.parent, 'usersort', function(){
        if( this.isNew() ){
          this.save();
        }
      }, this);

    },

    url: function(){
      var url = BASE_URL;

      if( this.id ){
        url += '/'+ this.id;
      }

      return url;
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
