/**
 * The Popcorn._MediaElementProto object is meant to be used as a base
 * prototype for HTML*VideoElement and HTML*AudioElement wrappers.
 * MediaElementProto requires that users provide:
 *   - parentNode: the element owning the media div/iframe
 *   - _eventNamespace: the unique namespace for all events
 */
(function( Popcorn, document ) {

  /*********************************************************************************
   * parseUri 1.2.2
   * http://blog.stevenlevithan.com/archives/parseuri
   * (c) Steven Levithan <stevenlevithan.com>
   * MIT License
   */
  function parseUri (str) {
    var	o   = parseUri.options,
        m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
        uri = {},
        i   = 14;

    while (i--) {
      uri[o.key[i]] = m[i] || "";
    }

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
      if ($1) {
        uri[o.q.name][$1] = $2;
      }
    });

    return uri;
  }

  parseUri.options = {
    strictMode: false,
    key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    q:   {
      name:   "queryKey",
      parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
      strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
      loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
  };
  /*********************************************************************************/

  // Fake a TimeRanges object
  var _fakeTimeRanges = {
    length: 0,
    start: Popcorn.nop,
    end: Popcorn.nop
  };

  // Make sure the browser has MediaError
  MediaError = MediaError || (function() {
    function MediaError(code, msg) {
      this.code = code || null;
      this.message = msg || "";
    }
    MediaError.MEDIA_ERR_NONE_ACTIVE    = 0;
    MediaError.MEDIA_ERR_ABORTED        = 1;
    MediaError.MEDIA_ERR_NETWORK        = 2;
    MediaError.MEDIA_ERR_DECODE         = 3;
    MediaError.MEDIA_ERR_NONE_SUPPORTED = 4;

    return MediaError;
  }());


  function MediaElementProto(){}
  MediaElementProto.prototype = {

    _util: {

      // Each wrapper stamps a type.
      type: "HTML5",

      // How often to trigger timeupdate events
      TIMEUPDATE_MS: 250,

      // Standard width and height
      MIN_WIDTH: 300,
      MIN_HEIGHT: 150,

      // Check for attribute being set or value being set in JS.  The following are true:
      //   autoplay
      //   autoplay="true"
      //   v.autoplay=true;
      isAttributeSet: function( value ) {
        return ( typeof value === "string" || value === true );
      },

      parseUri: parseUri

    },

    // Mimic DOM events with custom, namespaced events on the document.
    // Each media element using this prototype needs to provide a unique
    // namespace for all its events via _eventNamespace.
    addEventListener: function( type, listener, useCapture ) {
      document.addEventListener( this._eventNamespace + type, listener, useCapture );
    },

    removeEventListener: function( type, listener, useCapture ) {
      document.removeEventListener( this._eventNamespace + type, listener, useCapture );
    },

    dispatchEvent: function( name ) {
      var customEvent = document.createEvent( "CustomEvent" ),
        detail = {
          type: name,
          target: this.parentNode,
          data: null
        };

      customEvent.initCustomEvent( this._eventNamespace + name, false, false, detail );
      document.dispatchEvent( customEvent );
    },

    load: Popcorn.nop,

    canPlayType: function( url ) {
      return "";
    },

    // Popcorn expects getBoundingClientRect to exist, forward to parent node.
    getBoundingClientRect: function() {
      return this.parentNode.getBoundingClientRect();
    },

    NETWORK_EMPTY: 0,
    NETWORK_IDLE: 1,
    NETWORK_LOADING: 2,
    NETWORK_NO_SOURCE: 3,

    HAVE_NOTHING: 0,
    HAVE_METADATA: 1,
    HAVE_CURRENT_DATA: 2,
    HAVE_FUTURE_DATA: 3,
    HAVE_ENOUGH_DATA: 4

  };

  MediaElementProto.prototype.constructor = MediaElementProto;

  Object.defineProperties( MediaElementProto.prototype, {

    currentSrc: {
      get: function() {
        return this.src !== undefined ? this.src : "";
      }
    },

    // We really can't do much more than "auto" with most of these.
    preload: {
      get: function() {
        return "auto";
      },
      set: Popcorn.nop
    },

    controls: {
      get: function() {
        return true;
      },
      set: Popcorn.nop
    },

    // TODO: it would be good to overlay an <img> using this URL
    poster: {
      get: function() {
        return "";
      },
      set: Popcorn.nop
    },

    crossorigin: {
      get: function() {
        return "";
      }
    },

    played: {
      get: function() {
        return _fakeTimeRanges;
      }
    },

    seekable: {
      get: function() {
        return _fakeTimeRanges;
      }
    },

    buffered: {
      get: function() {
        return _fakeTimeRanges;
      }
    },

    defaultMuted: {
      get: function() {
        return false;
      }
    },

    defaultPlaybackRate: {
      get: function() {
        return 1.0;
      }
    }

    // TODO:
    //   initialTime
    //   playbackRate
    //   startOffsetTime

  });

  Popcorn._MediaElementProto = MediaElementProto;

}( Popcorn, window.document ));
/**
 * The HTMLVideoElement and HTMLAudioElement are wrapped media elements
 * that are created within a DIV, and forward their properties and methods
 * to a wrapped object.
 */
(function( Popcorn, document ) {

  function canPlaySrc( src ) {
    // We can't really know based on URL.
    return "maybe";
  }

  function wrapMedia( id, mediaType ) {
    var parent = typeof id === "string" ? document.querySelector( id ) : id,
      media = document.createElement( mediaType );

    parent.appendChild( media );

    // Add the helper function _canPlaySrc so this works like other wrappers.
    media._canPlaySrc = canPlaySrc;

    return media;
  }

  Popcorn.HTMLVideoElement = function( id ) {
    return wrapMedia( id, "video" );
  };
  Popcorn.HTMLVideoElement._canPlaySrc = canPlaySrc;


  Popcorn.HTMLAudioElement = function( id ) {
    return wrapMedia( id, "audio" );
  };
  Popcorn.HTMLAudioElement._canPlaySrc = canPlaySrc;

}( Popcorn, window.document ));
/**
 * Simplified Media Fragments (http://www.w3.org/TR/media-frags/) Null player.
 * Valid URIs include:
 *
 *   #t=,100   -- a null video of 100s
 *   #t=5,100  -- a null video of 100s, which starts at 5s (i.e., 95s duration)
 *
 */
(function( Popcorn, document ) {

  var

  // How often (ms) to update the video's current time,
  // and by how much (s).
  DEFAULT_UPDATE_RESOLUTION_MS = 16,
  DEFAULT_UPDATE_RESOLUTION_S = DEFAULT_UPDATE_RESOLUTION_MS / 1000,

  EMPTY_STRING = "",

  // We currently support simple temporal fragments:
  //   #t=,100   -- a null video of 100s (starts at 0s)
  //   #t=5,100  -- a null video of 100s, which starts at 5s (i.e., 95s duration)
  temporalRegex = /#t=(\d+)?,?(\d+)?/;

  function NullPlayer( options ) {
    this.currentTime = options.currentTime || 0;
    this.duration = options.duration || NaN;
    this.playInterval = null;
    this.ended = options.endedCallback || Popcorn.nop;
  }

  function nullPlay( video ) {
    if( video.currentTime + DEFAULT_UPDATE_RESOLUTION_S >= video.duration ) {
      video.currentTime = video.duration;
      video.pause();
      video.ended();
    } else {
      video.currentTime += DEFAULT_UPDATE_RESOLUTION_S;
    }
  }

  NullPlayer.prototype = {

    play: function() {
      var video = this;
      this.playInterval = setInterval( function() { nullPlay( video ); },
                                       DEFAULT_UPDATE_RESOLUTION_MS );
    },

    pause: function() {
      clearInterval( this.playInterval );
    },

    seekTo: function( aTime ) {
      aTime = aTime < 0 ? 0 : aTime;
      aTime = aTime > this.duration ? this.duration : aTime;
      this.currentTime = aTime;
    }

  };

  function HTMLNullVideoElement( id ) {

    var self = this,
      parent = typeof id === "string" ? document.querySelector( id ) : id,
      elem,
      playerReady = false,
      player,
      impl = {
        src: EMPTY_STRING,
        networkState: self.NETWORK_EMPTY,
        readyState: self.HAVE_NOTHING,
        autoplay: EMPTY_STRING,
        preload: EMPTY_STRING,
        controls: EMPTY_STRING,
        loop: false,
        poster: EMPTY_STRING,
        volume: 1,
        muted: false,
        width: parent.width|0   ? parent.width  : self._util.MIN_WIDTH,
        height: parent.height|0 ? parent.height : self._util.MIN_HEIGHT,
        seeking: false,
        ended: false,
        paused: 1, // 1 vs. true to differentiate first time access
        error: null
      },
      playerReadyCallbacks = [],
      timeUpdateInterval;

    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLNullVideoElement::" );

    // Attach parentNode
    self.parentNode = parent;

    // Mark type as NullVideo
    self._util.type = "NullVideo";

    function addPlayerReadyCallback( callback ) {
      playerReadyCallbacks.unshift( callback );
    }

    function onPlayerReady( ) {
      playerReady = true;

      impl.networkState = self.NETWORK_IDLE;
      impl.readyState = self.HAVE_METADATA;
      self.dispatchEvent( "loadedmetadata" );

      self.dispatchEvent( "loadeddata" );

      impl.readyState = self.HAVE_FUTURE_DATA;
      self.dispatchEvent( "canplay" );

      impl.readyState = self.HAVE_ENOUGH_DATA;
      self.dispatchEvent( "canplaythrough" );

      var i = playerReadyCallbacks.length;
      while( i-- ) {
        playerReadyCallbacks[ i ]();
        delete playerReadyCallbacks[ i ];
      }

      // Auto-start if necessary
      if( impl.autoplay ) {
        self.play();
      }
    }

    function getDuration() {
      return player ? player.duration : NaN;
    }

    function destroyPlayer() {
      if( !( playerReady && player ) ) {
        return;
      }
      player.pause();
      player = null;
      parent.removeChild( elem );
      elem = null;
    }

    function changeSrc( aSrc ) {
      if( !self._canPlaySrc( aSrc ) ) {
        impl.error = {
          name: "MediaError",
          message: "Media Source Not Supported",
          code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        };
        self.dispatchEvent( "error" );
        return;
      }

      impl.src = aSrc;

      if( playerReady ) {
        destroyPlayer();
      }

      elem = document.createElement( "div" );
      elem.width = impl.width;
      elem.height = impl.height;
      parent.appendChild( elem );

      // Parse out the start and duration, if specified
      var fragments = temporalRegex.exec( aSrc ),
          start = fragments[ 1 ],
          duration = fragments [ 2 ];

      player = new NullPlayer({
        currentTime: start,
        duration: duration,
        endedCallback: onEnded
      });

      self.dispatchEvent( "loadstart" );
      self.dispatchEvent( "progress" );
      self.dispatchEvent( "durationchange" );
      onPlayerReady();
    }

    function getCurrentTime() {
      if( !playerReady ) {
        return 0;
      }

      return player.currentTime;
    }

    function changeCurrentTime( aTime ) {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { changeCurrentTime( aTime ); } );
        return;
      }

      onSeeking();
      player.seekTo( aTime );
      onSeeked();
    }

    function onTimeUpdate() {
      self.dispatchEvent( "timeupdate" );
    }

    function onSeeking( target ) {
      impl.seeking = true;
      self.dispatchEvent( "seeking" );
    }

    function onSeeked() {
      impl.seeking = false;
      self.dispatchEvent( "timeupdate" );
      self.dispatchEvent( "seeked" );
      self.dispatchEvent( "canplay" );
      self.dispatchEvent( "canplaythrough" );
    }

    function onPlay() {
      // Deal with first time play vs. subsequent.
      if( impl.paused === 1 ) {
        impl.paused = false;
        self.dispatchEvent( "play" );
        self.dispatchEvent( "playing" );
      } else {
        if( impl.ended ) {
          changeCurrentTime( 0 );
        }

        if ( impl.paused ) {
          impl.paused = false;
          if ( !impl.loop ) {
            self.dispatchEvent( "play" );
          }
          self.dispatchEvent( "playing" );
        }
      }

      timeUpdateInterval = setInterval( onTimeUpdate,
                                        self._util.TIMEUPDATE_MS );
    }

    self.play = function() {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { self.play(); } );
        return;
      }
      player.play();
      onPlay();
    };

    function onPause() {
      impl.paused = true;
      clearInterval( timeUpdateInterval );
      self.dispatchEvent( "pause" );
    }

    self.pause = function() {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { self.pause(); } );
        return;
      }
      player.pause();
      onPause();
    };

    function onEnded() {
      if( impl.loop ) {
        changeCurrentTime( 0 );
        self.play();
      } else {
        impl.ended = true;
        clearInterval( timeUpdateInterval );
        self.dispatchEvent( "timeupdate" );
        self.dispatchEvent( "ended" );
      }
    }

    function setVolume( aValue ) {
      impl.volume = aValue;
      self.dispatchEvent( "volumechange" );
    }

    function getVolume() {
      return impl.volume;
    }

    function setMuted( aValue ) {
      impl.muted = aValue;
      self.dispatchEvent( "volumechange" );
    }

    function getMuted() {
      return impl.muted;
    }

    Object.defineProperties( self, {

      src: {
        get: function() {
          return impl.src;
        },
        set: function( aSrc ) {
          if( aSrc && aSrc !== impl.src ) {
            changeSrc( aSrc );
          }
        }
      },

      autoplay: {
        get: function() {
          return impl.autoplay;
        },
        set: function( aValue ) {
          impl.autoplay = self._util.isAttributeSet( aValue );
        }
      },

      loop: {
        get: function() {
          return impl.loop;
        },
        set: function( aValue ) {
          impl.loop = self._util.isAttributeSet( aValue );
        }
      },

      width: {
        get: function() {
          return elem.width;
        },
        set: function( aValue ) {
          impl.width = aValue;
        }
      },

      height: {
        get: function() {
          return elem.height;
        },
        set: function( aValue ) {
          impl.height = aValue;
        }
      },

      currentTime: {
        get: function() {
          return getCurrentTime();
        },
        set: function( aValue ) {
          changeCurrentTime( aValue );
        }
      },

      duration: {
        get: function() {
          return getDuration();
        }
      },

      ended: {
        get: function() {
          return impl.ended;
        }
      },

      paused: {
        get: function() {
          return impl.paused;
        }
      },

      seeking: {
        get: function() {
          return impl.seeking;
        }
      },

      readyState: {
        get: function() {
          return impl.readyState;
        }
      },

      networkState: {
        get: function() {
          return impl.networkState;
        }
      },

      volume: {
        get: function() {
          return getVolume();
        },
        set: function( aValue ) {
          if( aValue < 0 || aValue > 1 ) {
            throw "Volume value must be between 0.0 and 1.0";
          }
          setVolume( aValue );
        }
      },

      muted: {
        get: function() {
          return getMuted();
        },
        set: function( aValue ) {
          setMuted( self._util.isAttributeSet( aValue ) );
        }
      },

      error: {
        get: function() {
          return impl.error;
        }
      }
    });
  }

  HTMLNullVideoElement.prototype = new Popcorn._MediaElementProto();
  HTMLNullVideoElement.prototype.constructor = HTMLNullVideoElement;

  // Helper for identifying URLs we know how to play.
  HTMLNullVideoElement.prototype._canPlaySrc = function( url ) {
    return ( /#t=\d*,?\d+?/ ).test( url ) ?
      "probably" :
      EMPTY_STRING;
  };

  // We'll attempt to support a mime type of video/x-nullvideo
  HTMLNullVideoElement.prototype.canPlayType = function( type ) {
    return type === "video/x-nullvideo" ? "probably" : EMPTY_STRING;
  };

  Popcorn.HTMLNullVideoElement = function( id ) {
    return new HTMLNullVideoElement( id );
  };
  Popcorn.HTMLNullVideoElement._canPlaySrc = HTMLNullVideoElement.prototype._canPlaySrc;

}( Popcorn, document ));
(function( Popcorn, window, document ) {

  var

  CURRENT_TIME_MONITOR_MS = 16,
  EMPTY_STRING = "",

  // Setup for SoundCloud API
  scReady = false,
  scLoaded = false,
  scCallbacks = [];

  function isSoundCloudReady() {
    // If the SoundCloud Widget API + JS SDK aren't loaded, do it now.
    if( !scLoaded ) {
      Popcorn.getScript( "//w.soundcloud.com/player/api.js", function() {
        Popcorn.getScript( "//connect.soundcloud.com/sdk.js", function() {
          scReady = true;

          // XXX: SoundCloud won't let us use real URLs with the API,
          // so we have to lookup the track URL, requiring authentication.
          SC.initialize({
            client_id: "PRaNFlda6Bhf5utPjUsptg"
          });

          var i = scCallbacks.length;
          while( i-- ) {
            scCallbacks[ i ]();
            delete scCallbacks[ i ];
          }
        });
      });
      scLoaded = true;
    }
    return scReady;
  }

  function addSoundCloudCallback( callback ) {
    scCallbacks.unshift( callback );
  }


  function HTMLSoundCloudAudioElement( id ) {

    // SoundCloud API requires postMessage
    if( !window.postMessage ) {
      throw "ERROR: HTMLSoundCloudAudioElement requires window.postMessage";
    }

    var self = this,
      parent = typeof id === "string" ? Popcorn.dom.find( id ) : id,
      elem,
      impl = {
        src: EMPTY_STRING,
        networkState: self.NETWORK_EMPTY,
        readyState: self.HAVE_NOTHING,
        seeking: false,
        autoplay: EMPTY_STRING,
        preload: EMPTY_STRING,
        controls: false,
        loop: false,
        poster: EMPTY_STRING,
        // SC Volume values are 0-100, we remap to 0-1 in volume getter/setter
        volume: 100,
        muted: 0,
        currentTime: 0,
        duration: NaN,
        ended: false,
        paused: true,
        width: parent.width|0   ? parent.width  : self._util.MIN_WIDTH,
        height: parent.height|0 ? parent.height : self._util.MIN_HEIGHT,
        error: null
      },
      playerReady = false,
      player,
      playerReadyCallbacks = [],
      timeUpdateInterval,
      currentTimeInterval,
      lastCurrentTime = 0;

    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLSoundCloudAudioElement::" );

    self.parentNode = parent;

    // Mark this as SoundCloud
    self._util.type = "SoundCloud";

    function addPlayerReadyCallback( callback ) {
      playerReadyCallbacks.unshift( callback );
    }

    // SoundCloud's widget fires its READY event too early for the audio
    // to be used (i.e., the widget is setup, but not the audio decoder).
    // To deal with this we have to wait on loadProgress to fire with a
    // loadedProgress > 0.
    function onLoaded() {
      // Wire-up runtime listeners
      player.bind( SC.Widget.Events.LOAD_PROGRESS, function( data ) {
        onStateChange({
          type: "loadProgress",
          // currentTime is in ms vs. s
          data: data.currentPosition / 1000
        });
      });

      player.bind( SC.Widget.Events.PLAY_PROGRESS, function( data ) {
        onStateChange({
          type: "playProgress",
          // currentTime is in ms vs. s
          data: data.currentPosition / 1000
        });
      });

      player.bind( SC.Widget.Events.PLAY, function( data ) {
        onStateChange({
          type: "play"
        });
      });

      player.bind( SC.Widget.Events.PAUSE, function( data ) {
        onStateChange({
          type: "pause"
        });
      });

      player.bind( SC.Widget.Events.SEEK, function( data ) {
        onStateChange({
          type: "seek",
          // currentTime is in ms vs. s
          data: data.currentPosition / 1000
        });
      });

      player.bind( SC.Widget.Events.FINISH, function() {
        onStateChange({
          type: "finish"
        });
      });

      playerReady = true;
      player.getDuration( updateDuration );

      // Apply the current controls state again, since we have
      // to do one thing for controls=false and loading, and another
      // for controls=false and loaded.
      setControls( impl.controls );
    }

    // When the player widget is ready, kick-off a play/pause
    // in order to get the data loading.  We'll wait on loadedProgress.
    // It's possible for the loadProgress to take time after play(), so
    // we don't call pause() right away, but wait on loadedProgress to be 1
    // before we do.
    function onPlayerReady( data ) {
      player.bind( SC.Widget.Events.LOAD_PROGRESS, function( data ) {

        // If we're getting the HTML5 audio, loadedProgress will be 0 or 1.
        // If we're getting Flash, it will be 0 or > 0.  Prefer > 0 to make
        // both happy.
        if( data.loadedProgress > 0 ) {
          player.unbind( SC.Widget.Events.LOAD_PROGRESS );
          player.pause();
        }
      });

      player.bind( SC.Widget.Events.PLAY, function( data ) {
        player.unbind( SC.Widget.Events.PLAY );

        player.bind( SC.Widget.Events.PAUSE, function( data ) {
          player.unbind( SC.Widget.Events.PAUSE );

          // Play/Pause cycle is done, restore volume and continue loading.
          player.setVolume( 100 );
          onLoaded();
        });
      });

      // Turn down the volume and kick-off a play to force load
      player.setVolume( 0 );
      player.play();
    }

    function updateDuration( newDuration ) {
      // SoundCloud gives duration in ms vs. s
      newDuration = newDuration / 1000;

      var oldDuration = impl.duration;

      if( oldDuration !== newDuration ) {
        impl.duration = newDuration;
        self.dispatchEvent( "durationchange" );

        // Deal with first update of duration
        if( isNaN( oldDuration ) ) {
          impl.networkState = self.NETWORK_IDLE;
          impl.readyState = self.HAVE_METADATA;
          self.dispatchEvent( "loadedmetadata" );

          self.dispatchEvent( "loadeddata" );

          impl.readyState = self.HAVE_FUTURE_DATA;
          self.dispatchEvent( "canplay" );

          impl.readyState = self.HAVE_ENOUGH_DATA;
          self.dispatchEvent( "canplaythrough" );

          var i = playerReadyCallbacks.length;
          while( i-- ) {
            playerReadyCallbacks[ i ]();
            delete playerReadyCallbacks[ i ];
          }

          // Auto-start if necessary
          if( impl.paused && impl.autoplay ) {
            self.play();
          }
        }
      }
    }

    function getDuration() {
      if( !playerReady ) {
        // Queue a getDuration() call so we have correct duration info for loadedmetadata
        addPlayerReadyCallback( function() { getDuration(); } );
      }

      player.getDuration( updateDuration );
    }

    function destroyPlayer() {
      if( !( playerReady && player ) ) {
        return;
      }
      clearInterval( currentTimeInterval );
      player.pause();

      player.unbind( SC.Widget.Events.READY );
      player.unbind( SC.Widget.Events.LOAD_PROGRESS );
      player.unbind( SC.Widget.Events.PLAY_PROGRESS );
      player.unbind( SC.Widget.Events.PLAY );
      player.unbind( SC.Widget.Events.PAUSE );
      player.unbind( SC.Widget.Events.SEEK );
      player.unbind( SC.Widget.Events.FINISH );

      parent.removeChild( elem );
      elem = null;
    }

    self.play = function() {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { self.play(); } );
        return;
      }
      if( impl.ended ) {
        changeCurrentTime( 0 );
      }
      player.play();
    };

    function changeCurrentTime( aTime ) {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { changeCurrentTime( aTime ); } );
        return;
      }

      // Convert to ms
      aTime = aTime * 1000;

      onSeeking();
      player.seekTo( aTime );
    }

    function onSeeking() {
      impl.seeking = true;
      self.dispatchEvent( "seeking" );
    }

    function onSeeked() {
      // XXX: make sure seeks don't hold us in the ended state
      impl.ended = false;
      impl.seeking = false;
      self.dispatchEvent( "timeupdate" );
      self.dispatchEvent( "seeked" );
      self.dispatchEvent( "canplay" );
      self.dispatchEvent( "canplaythrough" );
    }

    self.pause = function() {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { self.pause(); } );
        return;
      }

      player.pause();
    };

    function onPause() {
      impl.paused = true;
      clearInterval( timeUpdateInterval );
      self.dispatchEvent( "pause" );
    }

    function onTimeUpdate() {
      self.dispatchEvent( "timeupdate" );
    }

    function onPlay() {
      if ( !currentTimeInterval ) {
        currentTimeInterval = setInterval( monitorCurrentTime,
                                           CURRENT_TIME_MONITOR_MS ) ;

        // Only 1 play when video.loop=true
        if ( impl.loop ) {
          self.dispatchEvent( "play" );
        }
      }

      timeUpdateInterval = setInterval( onTimeUpdate,
                                        self._util.TIMEUPDATE_MS );

      if( impl.paused ) {
        impl.paused = false;

        // Only 1 play when video.loop=true
        if ( !impl.loop ) {
          self.dispatchEvent( "play" );
        }
        self.dispatchEvent( "playing" );
      }
    }

    function onEnded() {
      if( impl.loop ) {
        changeCurrentTime( 0 );
        self.play();
      } else {
        // XXX: SoundCloud doesn't manage end/paused state well.  We have to
        // simulate a pause or we leave the player in a state where it can't
        // restart playing after ended.  Also, the onPause callback won't get
        // called when we do self.pause() here, so we manually set impl.paused
        // to get the state right.
        self.pause();
        onPause();

        impl.ended = true;
        self.dispatchEvent( "ended" );
      }
    }

    function onCurrentTime( currentTime ) {
      impl.currentTime = currentTime;

      if( currentTime !== lastCurrentTime ) {
        self.dispatchEvent( "timeupdate" );
      }

      lastCurrentTime = currentTime;
    }

    function onStateChange( event ) {
      switch ( event.type ) {
        case "loadProgress":
          self.dispatchEvent( "progress" );
          break;
        case "playProgress":
          onCurrentTime( event.data );
          break;
        case "play":
          onPlay();
          break;
        case "pause":
          onPause();
          break;
        case "finish":
          onEnded();
          break;
        case "seek":
          onCurrentTime( event.data );
          onSeeked();
          break;
      }
    }

    function monitorCurrentTime() {
      if ( impl.ended ) {
        return;
      }
      player.getPosition( function( currentTimeInMS ) {
        // Convert from ms to s
        onCurrentTime( currentTimeInMS / 1000 );
      });
    }

    function changeSrc( aSrc ) {
      if( !self._canPlaySrc( aSrc ) ) {
        impl.error = {
          name: "MediaError",
          message: "Media Source Not Supported",
          code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        };
        self.dispatchEvent( "error" );
        return;
      }

      impl.src = aSrc;

      if( playerReady ) {
        destroyPlayer();
      }

      // Make sure SoundCloud is ready, and if not, register a callback
      if( !isSoundCloudReady() ) {
        addSoundCloudCallback( function() { changeSrc( aSrc ); } );
        return;
      }

      playerReady = false;

      SC.get( "/resolve", { url: aSrc }, function( data ) {
        elem = document.createElement( "iframe" );
        elem.id = Popcorn.guid( "soundcloud-" );
        elem.width = impl.width;
        elem.height = impl.height;
        elem.frameBorder = 0;
        elem.webkitAllowFullScreen = true;
        elem.mozAllowFullScreen = true;
        elem.allowFullScreen = true;

        // Apply the current controls state, since iframe wasn't ready yet.
        setControls( impl.controls );

        parent.appendChild( elem );

        elem.onload = function() {
          elem.onload = null;

          player = SC.Widget( elem );
          player.bind( SC.Widget.Events.READY, onPlayerReady );

          impl.networkState = self.NETWORK_LOADING;
          self.dispatchEvent( "loadstart" );
          self.dispatchEvent( "progress" );
        };
        elem.src = "http://w.soundcloud.com/player/?url=" + data.uri +
          "&show_artwork=false" +
          "&buying=false" +
          "&liking=false" +
          "&sharing=false" +
          "&download=false" +
          "&show_comments=false" +
          "&show_user=false";
      });
    }

    function setVolume( aValue ) {
      impl.volume = aValue;

      if( !playerReady ) {
        addPlayerReadyCallback( function() {
          setVolume( aValue );
        });
        return;
      }
      player.setVolume( aValue );
      self.dispatchEvent( "volumechange" );
    }

    function getVolume() {
      // If we're muted, the volume is cached on impl.muted.
      return impl.muted > 0 ? impl.muted : impl.volume;
    }

    function setMuted( aMute ) {
      if( !playerReady ) {
        impl.muted = aMute ? 1 : 0;
        addPlayerReadyCallback( function() {
          setMuted( aMute );
        });
        return;
      }

      // Move the existing volume onto muted to cache
      // until we unmute, and set the volume to 0.
      if( aMute ) {
        impl.muted = impl.volume;
        setVolume( 0 );
      } else {
        impl.muted = 0;
        setVolume( impl.muted );
      }
    }

    function getMuted() {
      return impl.muted > 0;
    }

    function setControls( controls ) {
      // If the iframe elem isn't ready yet, bail.  We'll call again when it is.
      if ( elem ) {
        // Due to loading issues with hidden content, we have to be careful
        // about how we hide the player when controls=false.  Using opacity:0
        // will let the content load, but allow mouse events.  When it's totally
        // loaded we can visibility:hidden + position:absolute it.
        if ( playerReady ) {
          elem.style.position = "absolute";
          elem.style.visibility = controls ? "visible" : "hidden";
        } else {
          elem.style.opacity = controls ? "1" : "0";
          // Try to stop mouse events over the iframe while loading. This won't
          // work in current Opera or IE, but there's not much I can do
          elem.style.pointerEvents = controls ? "auto" : "none";
        }
      }
      impl.controls = controls;
    }

    Object.defineProperties( self, {

      src: {
        get: function() {
          return impl.src;
        },
        set: function( aSrc ) {
          if( aSrc && aSrc !== impl.src ) {
            changeSrc( aSrc );
          }
        }
      },

      autoplay: {
        get: function() {
          return impl.autoplay;
        },
        set: function( aValue ) {
          impl.autoplay = self._util.isAttributeSet( aValue );
        }
      },

      loop: {
        get: function() {
          return impl.loop;
        },
        set: function( aValue ) {
          impl.loop = self._util.isAttributeSet( aValue );
        }
      },

      width: {
        get: function() {
          return elem.width;
        },
        set: function( aValue ) {
          impl.width = aValue;
        }
      },

      height: {
        get: function() {
          return elem.height;
        },
        set: function( aValue ) {
          impl.height = aValue;
        }
      },

      currentTime: {
        get: function() {
          return impl.currentTime;
        },
        set: function( aValue ) {
          changeCurrentTime( aValue );
        }
      },

      duration: {
        get: function() {
          return impl.duration;
        }
      },

      ended: {
        get: function() {
          return impl.ended;
        }
      },

      paused: {
        get: function() {
          return impl.paused;
        }
      },

      seeking: {
        get: function() {
          return impl.seeking;
        }
      },

      readyState: {
        get: function() {
          return impl.readyState;
        }
      },

      networkState: {
        get: function() {
          return impl.networkState;
        }
      },

      volume: {
        get: function() {
          // Remap from HTML5's 0-1 to SoundCloud's 0-100 range
          var volume = getVolume();
          return volume / 100;
        },
        set: function( aValue ) {
          if( aValue < 0 || aValue > 1 ) {
            throw "Volume value must be between 0.0 and 1.0";
          }

          // Remap from HTML5's 0-1 to SoundCloud's 0-100 range
          aValue = aValue * 100;
          setVolume( aValue );
        }
      },

      muted: {
        get: function() {
          return getMuted();
        },
        set: function( aValue ) {
          setMuted( self._util.isAttributeSet( aValue ) );
        }
      },

      error: {
        get: function() {
          return impl.error;
        }
      },

      // Similar to HTML5 Audio Elements, with SoundCloud you can
      // hide all visible UI for the player by setting controls=false.
      controls: {
        get: function() {
          return impl.controls;
        },
        set: function( aValue ) {
          setControls( !!aValue );
        }
      }
    });
  }

  HTMLSoundCloudAudioElement.prototype = new Popcorn._MediaElementProto();

  // Helper for identifying URLs we know how to play.
  HTMLSoundCloudAudioElement.prototype._canPlaySrc = function( url ) {
    return (/(?:http:\/\/www\.|http:\/\/|www\.|\.|^)(soundcloud)/).test( url ) ?
      "probably" : EMPTY_STRING;
  };

  // We'll attempt to support a mime type of audio/x-soundcloud
  HTMLSoundCloudAudioElement.prototype.canPlayType = function( type ) {
    return type === "audio/x-soundcloud" ? "probably" : EMPTY_STRING;
  };

  Popcorn.HTMLSoundCloudAudioElement = function( id ) {
    return new HTMLSoundCloudAudioElement( id );
  };
  Popcorn.HTMLSoundCloudAudioElement._canPlaySrc = HTMLSoundCloudAudioElement.prototype._canPlaySrc;

}( Popcorn, window, document ));
(function( Popcorn, window, document ) {

  var

  CURRENT_TIME_MONITOR_MS = 16,
  EMPTY_STRING = "",
  VIMEO_PLAYER_URL = "http://player.vimeo.com/video/",

  // Vimeo doesn't give a suggested min size, YouTube suggests 200x200
  // as minimum, video spec says 300x150.
  MIN_WIDTH = 300,
  MIN_HEIGHT = 200;

  // Utility wrapper around postMessage interface
  function VimeoPlayer( vimeoIFrame ) {
    var self = this,
      url = vimeoIFrame.src.split('?')[0],
      muted = 0;

    if( url.substr(0, 2) === '//' ) {
      url = window.location.protocol + url;
    }

    function sendMessage( method, params ) {
      var data = JSON.stringify({
        method: method,
        value: params
      });

      // The iframe has been destroyed, it just doesn't know it
      if ( !vimeoIFrame.contentWindow ) {
        return;
      }

      vimeoIFrame.contentWindow.postMessage( data, url );
    }

    var methods = ( "play pause paused seekTo unload getCurrentTime getDuration " +
                    "getVideoEmbedCode getVideoHeight getVideoWidth getVideoUrl " +
                    "getColor setColor setLoop getVolume setVolume addEventListener" ).split(" ");
    methods.forEach( function( method ) {
      // All current methods take 0 or 1 args, always send arg0
      self[ method ] = function( arg0 ) {
        sendMessage( method, arg0 );
      };
    });
  }


  function HTMLVimeoVideoElement( id ) {

    // Vimeo iframe API requires postMessage
    if( !window.postMessage ) {
      throw "ERROR: HTMLVimeoVideoElement requires window.postMessage";
    }

    var self = this,
      parent = typeof id === "string" ? Popcorn.dom.find( id ) : id,
      elem,
      impl = {
        src: EMPTY_STRING,
        networkState: self.NETWORK_EMPTY,
        readyState: self.HAVE_NOTHING,
        seeking: false,
        autoplay: EMPTY_STRING,
        preload: EMPTY_STRING,
        controls: false,
        loop: false,
        poster: EMPTY_STRING,
        // Vimeo seems to use .77 as default
        volume: 1,
        // Vimeo has no concept of muted, store volume values
        // such that muted===0 is unmuted, and muted>0 is muted.
        muted: 0,
        currentTime: 0,
        duration: NaN,
        ended: false,
        paused: true,
        width: parent.width|0   ? parent.width  : MIN_WIDTH,
        height: parent.height|0 ? parent.height : MIN_HEIGHT,
        error: null
      },
      playerReady = false,
      playerUID = Popcorn.guid(),
      player,
      playerReadyCallbacks = [],
      timeUpdateInterval,
      currentTimeInterval,
      lastCurrentTime = 0;

    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLVimeoVideoElement::" );

    self.parentNode = parent;

    // Mark type as Vimeo
    self._util.type = "Vimeo";

    function addPlayerReadyCallback( callback ) {
      playerReadyCallbacks.unshift( callback );
    }

    function onPlayerReady( event ) {
      player.addEventListener( 'loadProgress' );
      player.addEventListener( 'playProgress' );
      player.addEventListener( 'play' );
      player.addEventListener( 'pause' );
      player.addEventListener( 'finish' );
      player.addEventListener( 'seek' );

      player.getDuration();

      impl.networkState = self.NETWORK_LOADING;
      self.dispatchEvent( "loadstart" );
      self.dispatchEvent( "progress" );
    }

    function updateDuration( newDuration ) {
      var oldDuration = impl.duration;

      if( oldDuration !== newDuration ) {
        impl.duration = newDuration;
        self.dispatchEvent( "durationchange" );

        // Deal with first update of duration
        if( isNaN( oldDuration ) ) {
          impl.networkState = self.NETWORK_IDLE;
          impl.readyState = self.HAVE_METADATA;
          self.dispatchEvent( "loadedmetadata" );

          self.dispatchEvent( "loadeddata" );

          impl.readyState = self.HAVE_FUTURE_DATA;
          self.dispatchEvent( "canplay" );

          impl.readyState = self.HAVE_ENOUGH_DATA;
          self.dispatchEvent( "canplaythrough" );
          // Auto-start if necessary
          if( impl.autoplay ) {
            self.play();
          }

          var i = playerReadyCallbacks.length;
          while( i-- ) {
            playerReadyCallbacks[ i ]();
            delete playerReadyCallbacks[ i ];
          }
        }
      }
    }

    function getDuration() {
      if( !playerReady ) {
        // Queue a getDuration() call so we have correct duration info for loadedmetadata
        addPlayerReadyCallback( function() { getDuration(); } );
      }

      player.getDuration();
    }

    function destroyPlayer() {
      if( !( playerReady && player ) ) {
        return;
      }
      clearInterval( currentTimeInterval );
      player.pause();

      window.removeEventListener( 'message', onStateChange, false );
      parent.removeChild( elem );
      elem = null;
    }

    self.play = function() {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { self.play(); } );
        return;
      }

      player.play();
    };

    function changeCurrentTime( aTime ) {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { changeCurrentTime( aTime ); } );
        return;
      }

      onSeeking();
      player.seekTo( aTime );
    }

    function onSeeking() {
      impl.seeking = true;
      self.dispatchEvent( "seeking" );
    }

    function onSeeked() {
      impl.seeking = false;
      self.dispatchEvent( "timeupdate" );
      self.dispatchEvent( "seeked" );
      self.dispatchEvent( "canplay" );
      self.dispatchEvent( "canplaythrough" );
    }

    self.pause = function() {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { self.pause(); } );
        return;
      }

      player.pause();
    };

    function onPause() {
      impl.paused = true;
      clearInterval( timeUpdateInterval );
      self.dispatchEvent( "pause" );
    }

    function onTimeUpdate() {
      self.dispatchEvent( "timeupdate" );
    }

    function onPlay() {
      if( impl.ended ) {
        changeCurrentTime( 0 );
      }

      if ( !currentTimeInterval ) {
        currentTimeInterval = setInterval( monitorCurrentTime,
                                           CURRENT_TIME_MONITOR_MS ) ;

        // Only 1 play when video.loop=true
        if ( impl.loop ) {
          self.dispatchEvent( "play" );
        }
      }

      timeUpdateInterval = setInterval( onTimeUpdate,
                                        self._util.TIMEUPDATE_MS );

      if( impl.paused ) {
        impl.paused = false;

        // Only 1 play when video.loop=true
        if ( !impl.loop ) {
          self.dispatchEvent( "play" );
        }
        self.dispatchEvent( "playing" );
      }
    }

    function onEnded() {
      if( impl.loop ) {
        changeCurrentTime( 0 );
        self.play();
      } else {
        impl.ended = true;
        self.dispatchEvent( "ended" );
      }
    }

    function onCurrentTime( aTime ) {
      var currentTime = impl.currentTime = aTime;

      if( currentTime !== lastCurrentTime ) {
        self.dispatchEvent( "timeupdate" );
      }

      lastCurrentTime = impl.currentTime;
    }

    // We deal with the startup load messages differently than
    // we will once the player is fully ready and loaded.
    // When the player is "ready" it is playable, but not
    // yet seekable.  We need to force a play() to get data
    // to download (mimic preload=auto), or seeks will fail.
    function startupMessage( event ) {
      if( event.origin !== "http://player.vimeo.com" ) {
        return;
      }

      var data;
      try {
        data = JSON.parse( event.data );
      } catch ( ex ) {
        console.warn( ex );
      }

      if ( data.player_id != playerUID ) {
        return;
      }

      switch ( data.event ) {
        case "ready":
          player = new VimeoPlayer( elem );
          player.addEventListener( "loadProgress" );
          player.addEventListener( "pause" );
          player.setVolume( 0 );
          player.play();
          break;
        case "loadProgress":
          var duration = parseFloat( data.data.duration );
          if( duration > 0 && !playerReady ) {
            playerReady = true;
            player.pause();
          }
          break;
        case "pause":
          player.setVolume( 1 );
          // Switch message pump to use run-time message callback vs. startup
          window.removeEventListener( "message", startupMessage, false );
          window.addEventListener( "message", onStateChange, false );
          onPlayerReady();
          break;
      }
    }

    function onStateChange( event ) {
      if( event.origin !== "http://player.vimeo.com" ) {
        return;
      }

      var data;
      try {
        data = JSON.parse( event.data );
      } catch ( ex ) {
        console.warn( ex );
      }

      if ( data.player_id != playerUID ) {
        return;
      }

      // Methods
      switch ( data.method ) {
        case "getCurrentTime":
          onCurrentTime( parseFloat( data.value ) );
          break;
        case "getDuration":
          updateDuration( parseFloat( data.value ) );
          break;
        case "getVolume":
          onVolume( parseFloat( data.value ) );
          break;
      }

      // Events
      switch ( data.event ) {
        case "loadProgress":
          self.dispatchEvent( "progress" );
          updateDuration( parseFloat( data.data.duration ) );
          break;
        case "playProgress":
          onCurrentTime( parseFloat( data.data.seconds ) );
          break;
        case "play":
          onPlay();
          break;
        case "pause":
          onPause();
          break;
        case "finish":
          onEnded();
          break;
        case "seek":
          onCurrentTime( parseFloat( data.data.seconds ) );
          onSeeked();
          // Deal with Vimeo playing when paused after a seek
          if( impl.paused ) {
            self.pause();
          }
          break;
      }
    }

    function monitorCurrentTime() {
      player.getCurrentTime();
    }

    function changeSrc( aSrc ) {
      if( !self._canPlaySrc( aSrc ) ) {
        impl.error = {
          name: "MediaError",
          message: "Media Source Not Supported",
          code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        };
        self.dispatchEvent( "error" );
        return;
      }

      impl.src = aSrc;

      if( playerReady ) {
        destroyPlayer();
      }

      playerReady = false;

      var src = self._util.parseUri( aSrc ),
        queryKey = src.queryKey,
        key,
        optionsArray = [
          // Vimeo API options first
          "api=1",
          "player_id=" + playerUID,
          // Turn off as much of the metadata/branding as possible
          "title=0",
          "byline=0",
          "portrait=0"
        ];

      // Sync loop and autoplay based on URL params, and delete.
      // We'll manage both internally.
      impl.loop = queryKey.loop === "1" || impl.loop;
      delete queryKey.loop;
      impl.autoplay = queryKey.autoplay === "1" || impl.autoplay;
      delete queryKey.autoplay;

      // Create the base vimeo player string. It will always have query string options
      src = "http://player.vimeo.com/video/" + ( /\d+$/ ).exec( src.path ) + "?";
      for( key in queryKey ) {
        if ( queryKey.hasOwnProperty( key ) ) {
          optionsArray.push( encodeURIComponent( key ) + "=" +
                             encodeURIComponent( queryKey[ key ] ) );
        }
      }
      src += optionsArray.join( "&" );

      elem = document.createElement( "iframe" );
      elem.id = playerUID;
      elem.width = impl.width; // 500?
      elem.height = impl.height; // 281?
      elem.frameBorder = 0;
      elem.webkitAllowFullScreen = true;
      elem.mozAllowFullScreen = true;
      elem.allowFullScreen = true;
      parent.appendChild( elem );
      elem.src = src;

      window.addEventListener( "message", startupMessage, false );
    }

    function onVolume( aValue ) {
      if( impl.volume !== aValue ) {
        impl.volume = aValue;
        self.dispatchEvent( "volumechange" );
      }
    }

    function setVolume( aValue ) {
      impl.volume = aValue;

      if( !playerReady ) {
        addPlayerReadyCallback( function() {
          setVolume( aValue );
        });
        return;
      }
      player.setVolume( aValue );
      self.dispatchEvent( "volumechange" );
    }

    function getVolume() {
      // If we're muted, the volume is cached on impl.muted.
      return impl.muted > 0 ? impl.muted : impl.volume;
    }

    function setMuted( aMute ) {
      if( !playerReady ) {
        impl.muted = aMute ? 1 : 0;
        addPlayerReadyCallback( function() {
          setMuted( aMute );
        });
        return;
      }

      // Move the existing volume onto muted to cache
      // until we unmute, and set the volume to 0.
      if( aMute ) {
        impl.muted = impl.volume;
        setVolume( 0 );
      } else {
        impl.muted = 0;
        setVolume( impl.muted );
      }
    }

    function getMuted() {
      return impl.muted > 0;
    }

    Object.defineProperties( self, {

      src: {
        get: function() {
          return impl.src;
        },
        set: function( aSrc ) {
          if( aSrc && aSrc !== impl.src ) {
            changeSrc( aSrc );
          }
        }
      },

      autoplay: {
        get: function() {
          return impl.autoplay;
        },
        set: function( aValue ) {
          impl.autoplay = self._util.isAttributeSet( aValue );
        }
      },

      loop: {
        get: function() {
          return impl.loop;
        },
        set: function( aValue ) {
          impl.loop = self._util.isAttributeSet( aValue );
        }
      },

      width: {
        get: function() {
          return elem.width;
        },
        set: function( aValue ) {
          impl.width = aValue;
        }
      },

      height: {
        get: function() {
          return elem.height;
        },
        set: function( aValue ) {
          impl.height = aValue;
        }
      },

      currentTime: {
        get: function() {
          return impl.currentTime;
        },
        set: function( aValue ) {
          changeCurrentTime( aValue );
        }
      },

      duration: {
        get: function() {
          return impl.duration;
        }
      },

      ended: {
        get: function() {
          return impl.ended;
        }
      },

      paused: {
        get: function() {
          return impl.paused;
        }
      },

      seeking: {
        get: function() {
          return impl.seeking;
        }
      },

      readyState: {
        get: function() {
          return impl.readyState;
        }
      },

      networkState: {
        get: function() {
          return impl.networkState;
        }
      },

      volume: {
        get: function() {
          return getVolume();
        },
        set: function( aValue ) {
          if( aValue < 0 || aValue > 1 ) {
            throw "Volume value must be between 0.0 and 1.0";
          }

          setVolume( aValue );
        }
      },

      muted: {
        get: function() {
          return getMuted();
        },
        set: function( aValue ) {
          setMuted( self._util.isAttributeSet( aValue ) );
        }
      },

      error: {
        get: function() {
          return impl.error;
        }
      }
    });
  }

  HTMLVimeoVideoElement.prototype = new Popcorn._MediaElementProto();
  HTMLVimeoVideoElement.prototype.constructor = HTMLVimeoVideoElement;

  // Helper for identifying URLs we know how to play.
  HTMLVimeoVideoElement.prototype._canPlaySrc = function( url ) {
    return ( (/player.vimeo.com\/video\/\d+/).test( url ) ||
             (/vimeo.com\/\d+/).test( url ) ) ? "probably" : EMPTY_STRING;
  };

  // We'll attempt to support a mime type of video/x-vimeo
  HTMLVimeoVideoElement.prototype.canPlayType = function( type ) {
    return type === "video/x-vimeo" ? "probably" : EMPTY_STRING;
  };

  Popcorn.HTMLVimeoVideoElement = function( id ) {
    return new HTMLVimeoVideoElement( id );
  };
  Popcorn.HTMLVimeoVideoElement._canPlaySrc = HTMLVimeoVideoElement.prototype._canPlaySrc;

}( Popcorn, window, document ));
(function( Popcorn, window, document ) {

  var

  CURRENT_TIME_MONITOR_MS = 10,
  EMPTY_STRING = "",

  // YouTube suggests 200x200 as minimum, video spec says 300x150.
  MIN_WIDTH = 300,
  MIN_HEIGHT = 200,

  // Example: http://www.youtube.com/watch?v=12345678901
  regexYouTube = /^.*(?:\/|v=)(.{11})/,

  ABS = Math.abs,

  // Setup for YouTube API
  ytReady = false,
  ytLoaded = false,
  ytCallbacks = [];

  function isYouTubeReady() {
    // If the YouTube iframe API isn't injected, to it now.
    if( !ytLoaded ) {
      var tag = document.createElement( "script" );
      var protocol = window.location.protocol === "file:" ? "http:" : "";

      tag.src = protocol + "//www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName( "script" )[ 0 ];
      firstScriptTag.parentNode.insertBefore( tag, firstScriptTag );
      ytLoaded = true;
    }
    return ytReady;
  }

  function addYouTubeCallback( callback ) {
    ytCallbacks.unshift( callback );
  }

  // An existing YouTube references can break us.
  // Remove it and use the one we can trust.
  if ( window.YT ) {
    window.quarantineYT = window.YT;
    window.YT = null;
  }

  window.onYouTubeIframeAPIReady = function() {
    ytReady = true;
    var i = ytCallbacks.length;
    while( i-- ) {
      ytCallbacks[ i ]();
      delete ytCallbacks[ i ];
    }
  };

  function HTMLYouTubeVideoElement( id ) {

    // YouTube iframe API requires postMessage
    if( !window.postMessage ) {
      throw "ERROR: HTMLYouTubeVideoElement requires window.postMessage";
    }

    var self = this,
      parent = typeof id === "string" ? document.querySelector( id ) : id,
      elem,
      impl = {
        src: EMPTY_STRING,
        networkState: self.NETWORK_EMPTY,
        readyState: self.HAVE_NOTHING,
        seeking: false,
        autoplay: EMPTY_STRING,
        preload: EMPTY_STRING,
        controls: false,
        loop: false,
        poster: EMPTY_STRING,
        volume: 1,
        muted: false,
        currentTime: 0,
        duration: NaN,
        ended: false,
        paused: true,
        width: parent.width|0   ? parent.width  : MIN_WIDTH,
        height: parent.height|0 ? parent.height : MIN_HEIGHT,
        error: null
      },
      playerReady = false,
      mediaReady = false,
      loopedPlay = false,
      player,
      playerPaused = true,
      mediaReadyCallbacks = [],
      currentTimeInterval,
      lastCurrentTime = 0,
      seekTarget = -1,
      timeUpdateInterval,
      firstPlay = true,
      forcedLoadMetadata = false;

    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLYouTubeVideoElement::" );

    self.parentNode = parent;

    // Mark this as YouTube
    self._util.type = "YouTube";

    function addMediaReadyCallback( callback ) {
      mediaReadyCallbacks.unshift( callback );
    }

    function onPlayerReady( event ) {
      playerReady = true;
    }

    // YouTube sometimes sends a duration of 0.  From the docs:
    // "Note that getDuration() will return 0 until the video's metadata is loaded,
    // which normally happens just after the video starts playing."
    function forceLoadMetadata() {
      if( !forcedLoadMetadata ) {
        forcedLoadMetadata = true;
        self.play();
        self.pause();
      }
    }

    function getDuration() {
      if( !mediaReady ) {
        // Queue a getDuration() call so we have correct duration info for loadedmetadata
        addMediaReadyCallback( function() { getDuration(); } );
        return impl.duration;
      }

      var oldDuration = impl.duration,
          newDuration = player.getDuration();

      // Deal with duration=0 from YouTube
      if( newDuration ) {
        if( oldDuration !== newDuration ) {
          impl.duration = newDuration;
          self.dispatchEvent( "durationchange" );
        }
      } else {
        // Force loading metadata, and wait on duration>0
        forceLoadMetadata();
        setTimeout( getDuration, 50 );
      }

      return newDuration;
    }

    function onPlayerError(event) {
      // There's no perfect mapping to HTML5 errors from YouTube errors.
      var err = { name: "MediaError" };

      switch( event.data ) {

        // invalid parameter
        case 2:
          err.message = "Invalid video parameter.";
          err.code = MediaError.MEDIA_ERR_ABORTED;
          break;

        // HTML5 Error
        case 5:
          err.message = "The requested content cannot be played in an HTML5 player or another error related to the HTML5 player has occurred.";
          err.code = MediaError.MEDIA_ERR_DECODE;

        // requested video not found
        case 100:
          err.message = "Video not found.";
          err.code = MediaError.MEDIA_ERR_NETWORK;
          break;

        // video can't be embedded by request of owner
        case 101:
        case 150:
          err.message = "Video not usable.";
          err.code = MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED;
          break;

        default:
          err.message = "Unknown error.";
          err.code = 5;
      }

      impl.error = err;
      self.dispatchEvent( "error" );
    }

    function onPlayerStateChange( event ) {
      switch( event.data ) {

        // unstarted
        case -1:
          // XXX: this should really live in cued below, but doesn't work.

          // force an initial play on the video, to remove autostart on initial seekTo.
          player.playVideo();
          break;

        // ended
        case YT.PlayerState.ENDED:
          onEnded();
          break;

        // playing
        case YT.PlayerState.PLAYING:
          if( firstPlay ) {
            // fake ready event
            firstPlay = false;

            // Set initial paused state
            if( impl.autoplay || !impl.paused ) {
              impl.paused = false;
              addMediaReadyCallback( function() { onPlay(); } );
            } else {
              player.pauseVideo();
            }
            
            impl.readyState = self.HAVE_METADATA;
            self.dispatchEvent( "loadedmetadata" );
            currentTimeInterval = setInterval( monitorCurrentTime,
                                               CURRENT_TIME_MONITOR_MS );
            
            self.dispatchEvent( "loadeddata" );

            impl.readyState = self.HAVE_FUTURE_DATA;
            self.dispatchEvent( "canplay" );

            mediaReady = true;
            var i = mediaReadyCallbacks.length;
            while( i-- ) {
              mediaReadyCallbacks[ i ]();
              delete mediaReadyCallbacks[ i ];
            }

            // We can't easily determine canplaythrough, but will send anyway.
            impl.readyState = self.HAVE_ENOUGH_DATA;
            self.dispatchEvent( "canplaythrough" );
          } else {
            onPlay();
          }
          break;

        // paused
        case YT.PlayerState.PAUSED:
          onPause();
          break;

        // buffering
        case YT.PlayerState.BUFFERING:
          impl.networkState = self.NETWORK_LOADING;
          self.dispatchEvent( "waiting" );
          break;

        // video cued
        case YT.PlayerState.CUED:
          // XXX: cued doesn't seem to fire reliably, bug in youtube api?
          break;
      }
    }

    function destroyPlayer() {
      if( !( playerReady && player ) ) {
        return;
      }
      clearInterval( currentTimeInterval );
      player.stopVideo();
      player.clearVideo();

      parent.removeChild( elem );
      elem = null;
    }

    function changeSrc( aSrc ) {
      if( !self._canPlaySrc( aSrc ) ) {
        impl.error = {
          name: "MediaError",
          message: "Media Source Not Supported",
          code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        };
        self.dispatchEvent( "error" );
        return;
      }

      impl.src = aSrc;

      // Make sure YouTube is ready, and if not, register a callback
      if( !isYouTubeReady() ) {
        addYouTubeCallback( function() { changeSrc( aSrc ); } );
        return;
      }

      if( playerReady ) {
        destroyPlayer();
      }

      elem = document.createElement( "div" );
      elem.width = impl.width;
      elem.height = impl.height;
      parent.appendChild( elem );

      // Use any player vars passed on the URL
      var playerVars = self._util.parseUri( aSrc ).queryKey;

      // Remove the video id, since we don't want to pass it
      delete playerVars.v;

      // Sync autoplay, but manage internally
      impl.autoplay = playerVars.autoplay === "1" || impl.autoplay;
      delete playerVars.autoplay;

      // Sync loop, but manage internally
      impl.loop = playerVars.loop === "1" || impl.loop;
      delete playerVars.loop;

      // Don't show related videos when ending
      playerVars.rel = playerVars.rel || 0;

      // Don't show YouTube's branding
      playerVars.modestbranding = playerVars.modestbranding || 1;

      // Don't show annotations by default
      playerVars.iv_load_policy = playerVars.iv_load_policy || 3;

      // Don't show video info before playing
      playerVars.showinfo = playerVars.showinfo || 0;

      // Specify our domain as origin for iframe security
      var domain = window.location.protocol === "file:" ? "*" :
        window.location.protocol + "//" + window.location.host;
      playerVars.origin = playerVars.origin || domain;

      // Show/hide controls. Sync with impl.controls and prefer URL value.
      playerVars.controls = playerVars.controls || impl.controls ? 2 : 0;
      impl.controls = playerVars.controls;

      // Set wmode to transparent to show video overlays
      playerVars.wmode = playerVars.wmode || "transparent";

      // Get video ID out of youtube url
      aSrc = regexYouTube.exec( aSrc )[ 1 ];

      player = new YT.Player( elem, {
        width: impl.width,
        height: impl.height,
        wmode: playerVars.wmode,
        videoId: aSrc,
        playerVars: playerVars,
        events: {
          'onReady': onPlayerReady,
          'onError': onPlayerError,
          'onStateChange': onPlayerStateChange
        }
      });

      impl.networkState = self.NETWORK_LOADING;
      self.dispatchEvent( "loadstart" );
      self.dispatchEvent( "progress" );

      // Queue a get duration call so we'll have duration info
      // and can dispatch durationchange.
      forcedLoadMetadata = false;
      getDuration();
    }

    function monitorCurrentTime() {
      var currentTime = impl.currentTime = player.getCurrentTime();

      // See if the user seeked the video via controls
      if( !impl.seeking && ABS( lastCurrentTime - currentTime ) > CURRENT_TIME_MONITOR_MS ) {
        onSeeking();
        onSeeked();
      }

      // See if we had a pending seek via code.  YouTube drops us within
      // 1 second of our target time, so we have to round a bit, or miss
      // many seek ends.
      if( ( seekTarget > -1 ) &&
          ( ABS( currentTime - seekTarget ) < 1 ) ) {
        seekTarget = -1;
        onSeeked();
      }
      lastCurrentTime = impl.currentTime;
    }

    function getCurrentTime() {
      if( !mediaReady ) {
        return 0;
      }

      impl.currentTime = player.getCurrentTime();
      return impl.currentTime;
    }

    function changeCurrentTime( aTime ) {
      if( !mediaReady ) {
        addMediaReadyCallback( function() { changeCurrentTime( aTime ); } );
        return;
      }

      onSeeking( aTime );
      player.seekTo( aTime );
    }

    function onTimeUpdate() {
      self.dispatchEvent( "timeupdate" );
    }

    function onSeeking( target ) {
      if( target !== undefined ) {
        seekTarget = target;
      }
      impl.seeking = true;
      self.dispatchEvent( "seeking" );
    }

    function onSeeked() {
      impl.seeking = false;
      self.dispatchEvent( "timeupdate" );
      self.dispatchEvent( "seeked" );
      self.dispatchEvent( "canplay" );
      self.dispatchEvent( "canplaythrough" );
    }

    function onPlay() {
      // We've called play once (maybe through autoplay),
      // no need to force it from now on.
      forcedLoadMetadata = true;

      if( impl.ended ) {
        changeCurrentTime( 0 );
      }
      timeUpdateInterval = setInterval( onTimeUpdate,
                                        self._util.TIMEUPDATE_MS );

      if( playerPaused ) {
        playerPaused = false;

        // Only 1 play when video.loop=true
        if ( ( impl.loop && !loopedPlay ) || !impl.loop ) {
          loopedPlay = true;
          self.dispatchEvent( "play" );
        }
        self.dispatchEvent( "playing" );
      }
    }

    self.play = function() {
      impl.paused = false;
      if( !mediaReady ) {
        addMediaReadyCallback( function() { self.play(); } );
        return;
      }
      player.playVideo();
    };

    function onPause() {
      if ( !playerPaused ) {
        playerPaused = true;
        clearInterval( timeUpdateInterval );
        self.dispatchEvent( "pause" );
      }
    }

    self.pause = function() {
      impl.paused = true;
      if( !mediaReady ) {
        addMediaReadyCallback( function() { self.pause(); } );
        return;
      }
      player.pauseVideo();
    };

    function onEnded() {
      if( impl.loop ) {
        changeCurrentTime( 0 );
        self.play();
      } else {
        impl.ended = true;
        self.dispatchEvent( "ended" );
      }
    }

    function setVolume( aValue ) {
      impl.volume = aValue;
      if( !mediaReady ) {
        addMediaReadyCallback( function() {
          setVolume( impl.volume );
        });
        return;
      }
      player.setVolume( impl.volume * 100 );
      self.dispatchEvent( "volumechange" );
    }

    function getVolume() {
      // YouTube has getVolume(), but for sync access we use impl.volume
      return impl.volume;
    }

    function setMuted( aValue ) {
      impl.muted = aValue;
      if( !mediaReady ) {
        addMediaReadyCallback( function() { setMuted( impl.muted ); } );
        return;
      }
      player[ aValue ? "mute" : "unMute" ]();
      self.dispatchEvent( "volumechange" );
    }

    function getMuted() {
      // YouTube has isMuted(), but for sync access we use impl.muted
      return impl.muted;
    }

    Object.defineProperties( self, {

      src: {
        get: function() {
          return impl.src;
        },
        set: function( aSrc ) {
          if( aSrc && aSrc !== impl.src ) {
            changeSrc( aSrc );
          }
        }
      },

      autoplay: {
        get: function() {
          return impl.autoplay;
        },
        set: function( aValue ) {
          impl.autoplay = self._util.isAttributeSet( aValue );
        }
      },

      loop: {
        get: function() {
          return impl.loop;
        },
        set: function( aValue ) {
          impl.loop = self._util.isAttributeSet( aValue );
        }
      },

      width: {
        get: function() {
          return elem.width;
        },
        set: function( aValue ) {
          impl.width = aValue;
        }
      },

      height: {
        get: function() {
          return elem.height;
        },
        set: function( aValue ) {
          impl.height = aValue;
        }
      },

      currentTime: {
        get: function() {
          return getCurrentTime();
        },
        set: function( aValue ) {
          changeCurrentTime( aValue );
        }
      },

      duration: {
        get: function() {
          return getDuration();
        }
      },

      ended: {
        get: function() {
          return impl.ended;
        }
      },

      paused: {
        get: function() {
          return impl.paused;
        }
      },

      seeking: {
        get: function() {
          return impl.seeking;
        }
      },

      readyState: {
        get: function() {
          return impl.readyState;
        }
      },

      networkState: {
        get: function() {
          return impl.networkState;
        }
      },

      volume: {
        get: function() {
          // Remap from HTML5's 0-1 to YouTube's 0-100 range
          var volume = getVolume();
          return volume / 100;
        },
        set: function( aValue ) {
          if( aValue < 0 || aValue > 1 ) {
            throw "Volume value must be between 0.0 and 1.0";
          }

          // Remap from HTML5's 0-1 to YouTube's 0-100 range
          aValue = aValue * 100;
          setVolume( aValue );
        }
      },

      muted: {
        get: function() {
          return getMuted();
        },
        set: function( aValue ) {
          setMuted( self._util.isAttributeSet( aValue ) );
        }
      },

      error: {
        get: function() {
          return impl.error;
        }
      }
    });
  }

  HTMLYouTubeVideoElement.prototype = new Popcorn._MediaElementProto();
  HTMLYouTubeVideoElement.prototype.constructor = HTMLYouTubeVideoElement;

  // Helper for identifying URLs we know how to play.
  HTMLYouTubeVideoElement.prototype._canPlaySrc = function( url ) {
    return (/(?:http:\/\/www\.|http:\/\/|www\.|\.|^)(youtu)/).test( url ) ?
      "probably" :
      EMPTY_STRING;
  };

  // We'll attempt to support a mime type of video/x-youtube
  HTMLYouTubeVideoElement.prototype.canPlayType = function( type ) {
    return type === "video/x-youtube" ? "probably" : EMPTY_STRING;
  };

  Popcorn.HTMLYouTubeVideoElement = function( id ) {
    return new HTMLYouTubeVideoElement( id );
  };
  Popcorn.HTMLYouTubeVideoElement._canPlaySrc = HTMLYouTubeVideoElement.prototype._canPlaySrc;

}( Popcorn, window, document ));
