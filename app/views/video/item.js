define(function(require, exports, module){

var _ = require('underscore');
var Backbone = require('backbone');

module.exports = Backbone.View.extend({

  className: 'media-item js-hidden',

  id: function(){
    return 'video-'+ this.model.cid;
  },

  initialize: function( params ){
    var self = this;
    this.parent = params.parent;

    if( !this.parent ){
      throw new Error('Requires a Parent view');
    }

    if( !this.model ){
      throw new Error('Requires a model');
    }

    this.ready = $.Deferred();

    this.render();

    this.listenTo(this.model, 'activate', this.activate);

    if( this.model.collection.where({ active: true }).length === 0 || this.model.get('active') ){
      this.model.set('active', true);
      setTimeout(function(){
        self.model.trigger('activate', true);
      },0);
    }
  },

  createPop: function(){
    this.pop = Popcorn.smart('#'+ this.id(), this.model.get('url'), {
      controls: true,
      width: 940,
      height: 480
    });

    this.listeners();
  },

  listeners: function(){
    var self = this;

    this.pop.on('canplay', _.once( this.onCanplay ).bind(this) );

    _.each(['playing', 'pause'], function(evt){

      this.pop.on( evt, function(){
        if( self.model.get('active') ){
          Backbone.trigger(evt, self.model);
        }
      });

    }, this);

    this.pop.on('pause', function(){
      Backbone.trigger('pause', this.model);
    }, this);

    var currentTime = 0;
    this.pop.on('timeupdate', function(){
      var newTime = self.pop.currentTime();
      if( newTime !== currentTime ){
        self.parent.trigger('timeupdate', newTime);
        currentTime = newTime;
      }
    });
  },

  onCanplay: function(){
    var self = this;

    if( self.parent.active !== self ){
      self.$el.addClass('js-hidden');
    }

    self.$el.addClass('js-loaded');

    // advance to the next item when playback is complete
    var end = self.model.get('end_time') || self.pop.duration() - 1;
    self.pop.cue( end, function(){
      setTimeout(function(){
        self.model.collection.next(self.model);
      }, 1000);
    });

    self.ready.resolve();
  },

  activate: function( play ){
    var self = this;

    this.createPop();

    this.model.collection.each(function(m){
      if( m.video && m.video.pop && m !== self.model ){
        m.video.hide();
      }
    });

    if( play ){
      this.play();
    }

    this.$el.addClass('js-active').removeClass('js-hidden');

    this.parent.active = this;
  },

  render: function(){
    this.$el.addClass( this.model.get('flavor') );
    this.parent.$el.append( this.el );
  },

  hide: function(){
    if( this.pop ) this.pop.pause();
    this.$el.addClass('js-hidden').removeClass('js-active');
  },

  play: function(){
    var self = this;

    function startPlayback(){
      // make sure that the player is visible when it's played
      self.$el.removeClass('js-hidden');
      // instant playback can cause problems with iframes
      setTimeout(function(){
        self.pop.play( self.model.get('start_time') || 0 );
      }, 100);
    }

    if( !this.pop ){
      this.createPop();
    }

    if( this.ready.state() === 'resolved' ){
      startPlayback();
    } else {
      this.ready.done( startPlayback );
    }

  },

  remove: function(){
    if( this.pop ){
      this.pop.pause();
      this.pop.destroy();
    }
    Backbone.View.prototype.remove.call(this);
  }

});



});

