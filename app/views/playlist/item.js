define([
  'underscore',
  'backbone',
  'tpl!templates/item.html'
], function(_, Backbone, itemTpl){

  return Backbone.View.extend({

    tagName: 'li',

    id: function(){
      return 'item'+ this.model.cid;
    },

    initialize: function(params){
      this.parent = params.parent;
      if( !this.model ){
        throw new Error('Requires a model');
      }

      this.render();
      this.parent.$('.ghost').before( this.el );

      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'activate', this.activate);
    },

    render: function(){
      this.$el
        .attr('draggable', true)
        .html( itemTpl( this.model ) );
    },

    activate: function(){
      this.parent.$('.js-active').removeClass('js-active');
      this.$el.addClass('js-active');
    },

    events: {
      'click': 'play',
      'click [data-action="destroy"]': 'destroy'
    },

    play: function(){
      this.model.trigger('activate', true);
    },

    destroy: function(e){
      e.preventDefault();
      this.model.destroy();
    }

  });

});

