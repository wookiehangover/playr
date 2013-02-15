define([
  'underscore',
  'backbone'
], function( _, Backbone ){

  return Backbone.View.extend({

    el: function(){
      return this.options.parent.$('.controls')[0];
    },

    initialize: function( params ){
      this.parent = params.parent;

      if( !this.parent ){
        throw new Error('Requires a Parent view');
      }
    },

    events: {
      'click [data-action]': 'controls'
    },

    controls: function(e){
      e.preventDefault();
      var action = $(e.currentTarget).data('action');
      var active = this.parent.active;

      if( active && active.pop[ action ] ){
        active.pop[action]();
      }

      if( action === 'next' ){
        this.parent.collection.next();
      }
    }

  });

});
