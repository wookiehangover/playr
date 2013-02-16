require([
  'backbone',
  'playr'
], function( Backbone, Playr ){

  $(function(){
    window.Playr = new Playr();

    Backbone.history.start();

    // if( localStorage.playlist ){
    //   window.Playr.collection.add( JSON.parse( localStorage.playlist ) );
    // }

    // $(window).bind('beforeunload', function(e){
    //   localStorage.playlist = JSON.stringify( window.Playr.collection.toJSON() );
    //   if( window.Playr.video.active ){
    //     localStorage.currentTime = window.Playr.video.active.pop.currentTime();
    //   } else {
    //     localStorage.currentTime = 0;
    //   }
    // });
  });

});
