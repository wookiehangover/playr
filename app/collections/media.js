define([
  'underscore',
  'backbone',
  'models/media',
  'models/playlist'
], function(_, Backbone, MediaModel, PlaylistModel){

  return Backbone.Collection.extend({
    model: MediaModel,

    initialize: function(){
      this.on('add', function(model){
        if( !model.get('order') ){
          model.set('order', this.indexOf(model), { silent: true });
        }
      }, this);

      this.on('usersort', this.userSort);

      this.playlist = new PlaylistModel(null, { parent: this });
    },

    url: function(){
      return this.playlist.url() + '/media';
    },

    userSort: function(){
      this.each(function(model){
        var index = model.view.$el.index() - 1;
        model.set({ order: index });
      });

      this.sort();
    },

    comparator: function(model){
      return model.get('order');
    },

    toJSON: function(){
      return this.map(function(model){ return _.clone(model.attributes); });
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
