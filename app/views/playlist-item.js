define([
  'underscore',
  'backbone',
  'tpl!templates/item.html'
], function(_, Backbone, itemTpl){

  return Backbone.View.extend({

    initialize: function(params){
      this.parent = params.parent;
      if( !this.model ){
        throw new Error('Requires a model');
      }

      this.render();
    },

    render: function(){
      this.$el.html( itemTpl( this.model ) );
      this.parent.$el.append( this.el );
    },

    events: {
      'click p': 'play'
    },

    play: function(){
      this.model.trigger('activate');
    }

  });

});

