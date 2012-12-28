define([
  'underscore',
  'backbone',
  'popcorn-require',
  'models/youtube'
], function(_, Backbone, Popcorn, YoutubeModel){

  var types = {
    youtube: /youtube/,
    vimeo: /vimeo/,
    soundcloud: /soundcloud/
  };

  var embeds = {
    soundcloud: /^\[soundcloud\ url\="([^"]+)/,
    iframe: /^<iframe/,
    youtube: /youtube.com\/embed\/([^"]+)/
  };

  return Backbone.Model.extend({

    initialize: function(){
      var self = this;
      this.setType();
      this.enhance();

      this.on('play', this.play);

      this.on('activate', function(){
        this.set('active', true);
        this.collection.each(function(m){
          if( m.cid !== self.cid ){
            m.set('active', false);
          }
        });
        this.collection.trigger('activated', this);
      }, this);
    },

    destroy: function(){
      this.view.remove();

      if( this.video ){
        this.video.pop.pause();
        this.video.remove();
      }

      if( this.get('active') ){
        this.collection.next( this );
      }
      this.collection.remove( this );
    },

    play: function(){
      if( this.video && this.video.pop ){
        this.video.pop.play();
      }
    },

    setType: function(){
      _.find(types, function(regex, type){
        if( regex.test( this.get('url') ) ){
          this.set('type', type);
          return true;
        }
      }, this);
    },

    enhance: function(){
      var type = this.get('type');

      if( type === 'youtube' ){
        this.metadata = new YoutubeModel(null, { parent: this });

        this.metadata.on('change', function(){
          this.trigger('change');
        }, this);
      }
    },

    parse: function(data){
      var url;

      if( url = embeds.soundcloud.exec( data.url ) ){
        data.url = url[1];
      }

      if( embeds.iframe.test( data.url ) && (url = data.url.match(embeds.youtube)) ){
        url = 'http://youtube.com/?v='+ url[1];
        data.url = url;
      }

      return data;
    }

  });

});

