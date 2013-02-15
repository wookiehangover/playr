define([
  'underscore',
  'backbone'
], function(_, Backbone){

  return Backbone.View.extend({

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

      this.dfd = $.Deferred();

      this.render();

      this.pop = Popcorn.smart('#'+ this.id(), this.model.get('url'), {
        controls: true,
        width: 940,
        height: 480
      });

      this.listeners();

      if( this.model.collection.where({ active: true }).length === 0 || this.model.get('active') ){
        this.model.set('active', true);
        setTimeout(function(){
          self.model.trigger('activate', true);
        },0);
      }
    },

    listeners: function(){
      var self = this;

      this.listenTo(this.model, 'activate', this.activate);

      this.pop.on('canplay', _.once( this.ready ).bind(this) );

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

    ready: function(){
      var self = this;

      if( self.parent.active !== self.model ){
        self.$el.addClass('js-hidden');
      }

      self.$el.addClass('js-loaded');

      self.pop.cue(self.pop.duration() - 1, function(){

        setTimeout(function(){
          self.model.collection.next(self.model);
        }, 1000);

      });

      self.dfd.resolve();
    },

    activate: function( play ){
      var self = this;

      this.model.collection.each(function(m){
        if( m.video && m !== self ){
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
      this.pop.pause();
      this.$el.addClass('js-hidden').removeClass('js-active');
    },

    play: function(){
      var self = this;
      this.dfd.done(function(){
        // make sure that the player is visible when it's played
        self.$el.removeClass('js-hidden');
        setTimeout(function(){

          if( localStorage.currentTime !== "0" ){
            self.pop.play(localStorage.currentTime);
            localStorage.currentTime = 0;
          } else {
            self.pop.play();
          }

        },100);
      });
    },

    remove: function(){
      this.pop.pause();
      this.pop.destroy();
      Backbone.View.prototype.remove.call(this);
    }

  });

});


