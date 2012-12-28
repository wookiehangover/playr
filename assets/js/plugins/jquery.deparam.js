// Ben Alman's $.deparam https://github.com/cowboy/jquery-bbq/blob/master/jquery.ba-bbq.js#L466
(function($){
  var decode = decodeURIComponent;
  $.deparam =  function( params, coerce ) {
      var obj = {},
        coerce_types = { 'true': !0, 'false': !1, 'null': null };

      // Iterate over all name=value pairs.
      $.each( params.replace( /\+/g, ' ' ).split( '&' ), function(j,v){
        var param = v.split( '=' ),
          key = decode( param[0] ),
          val,
          cur = obj,
          i = 0,

          // If key is more complex than 'foo', like 'a[]' or 'a[b][c]', split it
          // into its component parts.
          keys = key.split( '][' ),
          keys_last = keys.length - 1;

        // If the first keys part contains [ and the last ends with ], then []
        // are correctly balanced.
        if ( /\[/.test( keys[0] ) && /\]$/.test( keys[ keys_last ] ) ) {
          // Remove the trailing ] from the last keys part.
          keys[ keys_last ] = keys[ keys_last ].replace( /\]$/, '' );

          // Split first keys part into two parts on the [ and add them back onto
          // the beginning of the keys array.
          keys = keys.shift().split('[').concat( keys );

          keys_last = keys.length - 1;
        } else {
          // Basic 'foo' style key.
          keys_last = 0;
        }

        // Are we dealing with a name=value pair, or just a name?
        if ( param.length === 2 ) {
          val = decode( param[1] );

          // Coerce values.
          if ( coerce ) {
            val = val && !isNaN(val)            ? +val              // number
              : val === 'undefined'             ? undefined         // undefined
              : coerce_types[val] !== undefined ? coerce_types[val] // true, false, null
              : val;                                                // string
          }

          if ( keys_last ) {
            for ( ; i <= keys_last; i++ ) {
              key = keys[i] === '' ? cur.length : keys[i];
              cur = cur[key] = i < keys_last ? cur[key] || ( keys[i+1] && isNaN( keys[i+1] ) ? {} : [] ) : val;
            }

          } else {
            // Simple key, even simpler rules, since only scalars and shallow
            // arrays are allowed.

            if ( $.isArray( obj[key] ) ) {
              // val is already an array, so push on the next value.
              obj[key].push( val );

            } else if ( obj[key] !== undefined ) {
              // val isn't an array, but since a second value has been specified,
              // convert val into an array.
              obj[key] = [ obj[key], val ];

            } else {
              // val is a scalar.
              obj[key] = val;
            }
          }

        } else if ( key ) {
          // No value was defined, so set something meaningful.
          obj[key] = coerce ? undefined : '';
        }
      });

      return obj;
    };

})(jQuery);


