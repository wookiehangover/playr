define([
  'underscore',
  'backbone',
  'models/media'
], function(_, Backbone, MediaModel){

  return Backbone.Collection.extend({
    model: MediaModel,

    initialize: function(){
      this.on('add', function(model){
        if( !model.get('order') ){
          model.set('order', this.indexOf(model));
        }
      }, this);

      this.on('usersort', this.userSort);
    },

    userSort: function(){
      this.each(function(model){
        var index = model.view.$el.index() - 1;
        model.set({ order: index }, { silent: true });
      });

      this.sort();
    },

    comparator: function(model){
      return model.get('order');
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
