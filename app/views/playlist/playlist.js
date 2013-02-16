define([
  'underscore',
  'backbone',
  'views/playlist/item',
], function(_, Backbone, PlaylistItem){

  return Backbone.View.extend({
    el: $('#playlist'),

    initialize: function(params){
      if( !this.collection ){
        throw new Error('Requires a collection');
      }

      this.listenTo( this.collection, 'add', this.add);
    },

    add: function( model, collection ){
      model.view = new PlaylistItem({ model: model, parent: this });
    },

    events: {
      'dragstart .ghost': 'ghostDrag',
      'drop [draggable="true"]':  'drop',
      'dragend [draggable="true"]':   'dragEnd',
      'dragover [draggable="true"]':  'dragOver',
      'dragstart [draggable="true"]':  'dragStart',
      'dragleave [draggable="true"]': 'dragLeave'
    },

    drop: function(e){
      if (e.stopPropagation) e.stopPropagation();
      e.preventDefault();

      var droppedItem = $('#'+ e.originalEvent.dataTransfer.getData('Text'));

      $(e.currentTarget)
        .removeClass('drag-over')
        .before( droppedItem );

      this.collection.trigger('usersort');

      return false;
    },

    dragStart: function(e){
      $(e.currentTarget).addClass('dragging');

      e.originalEvent.dataTransfer.setData('Text', e.currentTarget.id );
      e.originalEvent.dataTransfer.dropEffect = 'move';
    },

    dragEnd: function(e){
      $(e.currentTarget).removeClass('dragging');
    },

    ghostDrag: function(e){
      e.preventDefault();
    },

    dragOver: function(e){
      if (e.preventDefault) e.preventDefault();
      $(e.currentTarget).addClass('drag-over');

      return false;
    },

    dragLeave: function(e){
      $(e.currentTarget).removeClass('drag-over');
    },

    load: function( id ){
      var _this = this;
      this.collection.reset();
      this.collection.playlist.set('id', id);
      var dfd = this.collection.playlist.fetch();

      return dfd;
    }

  });

});
