define([
  'underscore',
  'backbone'
], function(_, Backbone){

  return Backbone.View.extend({

    el: $('.welcome'),

    events: {
      'click [data-action="destroy"]': 'remove'
    }


  });

});
