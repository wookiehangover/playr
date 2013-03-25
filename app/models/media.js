define([
  'underscore',
  'backbone',
  'models/youtube',
  'models/soundcloud',
  'models/vimeo'
], function(_, Backbone, YoutubeModel, SoundcloudModel, VimeoModel){

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

      if( !this.get('type') ){
        this.setType();
      }

      this.setMetadata();

      this.on('activate', function(){
        this.set('active', true);

        if( this.collection ){
          this.collection.each(function(m){
            if( m.cid !== self.cid ){
              m.set('active', false);
            }
          });
          this.collection.trigger('activated', this);
        }
      }, this);

      this.on('add change:order', function(){
        if( !this.collection.playlist.isNew() ){
          this.save();
        }
      }, this);
    },

    destroy: function(){

      this.view.remove();

      if( this.video ){
        this.video.remove();
      }

      if( this.get('active') ){
        this.collection.next( this );
      }

      if( this.collection.length === 1 ){
        Backbone.trigger('pause');
      }

      Backbone.Model.prototype.destroy.call(this);
    },

    toJSON: function(){
      var model = {
        media: _.clone(this.attributes)
      };

      model.media.playlist_id = this.collection.playlist.id;

      return model;
    },

    setType: function(){
      _.find(types, function(regex, type){
        if( regex.test( this.get('url') ) ){
          this.set('flavor', type);
          return true;
        }
      }, this);
    },

    setMetadata: function(){
      var type = this.get('flavor');

      if( type === 'youtube' ){
        this.metadata = new YoutubeModel(null, { parent: this });
      }

      if( type === "soundcloud" ){
        this.metadata = new SoundcloudModel(null, { parent: this });
      }

      if( type === "vimeo" ){
        this.metadata = new VimeoModel(null, { parent: this });
      }

      if( this.metadata ){
        this.metadata.on('change', function(){
          this.trigger('change');
        }, this);
      }
    },

    validate: function(attrs){
      if( !$.trim(attrs.url) ){
        return "You must provide a valid url";
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

