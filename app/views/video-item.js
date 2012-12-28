define([
  'underscore',
  'backbone',
  'popcorn-require'
], function(_, Backbone, Popcorn){

  return Backbone.View.extend({

    className: 'media-item',

    id: function(){
      return 'video-'+ this.model.cid;
    },

    initialize: function( params ){
      this.parent = params.parent;

      if( !this.model ){
        throw new Error('Requires a model');
      }

      this.pop = Popcorn.smart(this.el, this.model.get('url'), {
        controls: true,
        width: 940,
        height: 480
      });

      this.dfd = $.Deferred();

      this.listenTo(this.model, 'activate', this.activate);

      this.pop.on('canplay', _.once( this.ready ).bind(this) );

      this.render();

      if( !this.parent.active ){
        this.model.trigger('activate');
      }
    },

    ready: function(){
      var self = this;

      if( self.parent.active !== self.model ){
        self.$el.addClass('js-hidden');
      }

      self.$el.addClass('js-loaded');
      self.dfd.resolve();

      self.pop.cue(self.pop.duration() - 0.5, function(){
        self.model.collection.trigger('next', self.model);
      });
    },

    activate: function(){
      var self = this;
      this.model.collection.each(function(m){
        if( m.video && m !== self ){
          m.video.hide();
        }
      });

      this.play();

      this.addClass('js-active');

      this.parent.active = this;
    },

    render: function(){
      this.parent.$el.append( this.el );
    },

    hide: function(){
      this.pop.pause();
      this.$el.addClass('js-hidden').removeClass('js-active');
    },

    show: function(){
      this.$el.removeClass('js-hidden');
    },

    play: function(){
      var self = this;
      this.dfd.done(function(){
        self.show();
        self.pop.play();
      });
    }

  });

});


