define([
  'underscore',
  'backbone'
], function( _, Backbone ){

  return Backbone.View.extend({

    el: $('#scrubber'),

    initialize: function( params ){
      this.parent = this.options.parent;

      if( !this.parent ){
        throw new Error('Requires parent view');
      }

      this.listenTo( this.parent, 'timeupdate', this.update);
      this.listenTo( Backbone, 'playing', this.setHandleWidth);

      this.handle = this.$('.handle');
      this.scrubberWidth = this.$el.width();
    },

    events: {
      'mousedown .handle': 'drag',
      'click': 'setPosition',
      'click .handle': function(){ return false; }
    },

    update: function( time ){
      var position = time * this.scrubberWidth / this.duration;
      this.handle.css('left', ~~(position - this.handleWidth) );
    },

    setHandleWidth: function(model){
      this.duration = model.video.pop.duration();
      this.handleWidth = this.duration / 100;
      this.handle.css('width', ~~this.handleWidth + '%');

      var title = model.metadata ? model.metadata.get('title'): model.get('url');
      this.$('marquee').text( title );
    },

    setPosition: function(e){
      e.preventDefault();
      e.stopPropagation();

      if( !this.parent.active ){
        return false;
      }

      var position = e.pageX - this.$el.offset().left - this.handleWidth;
      this.scrub( position * this.duration / this.scrubberWidth );
    },

    drag: function(e){
      e.preventDefault();
      e.stopPropagation();

      if( !this.parent.active ){
        return false;
      }

      var self = this;
      var handle = this.handle;
      var offset = this.$el.offset().left;

      function onMove(e){
        var position = e.pageX - offset - self.handleWidth;
        handle.css('left', position);
        self.scrub( position * self.duration /  self.scrubberWidth );
      }

      function onRelease(){
        $(this).off('.scrubber');
      }

      $(window)
        .on('mousemove.scrubber', onMove)
        .one('mouseup.scrubber', onRelease);
    },

    scrub: function(time){
      this.parent.active.pop.currentTime( time );
    }

  });

});
