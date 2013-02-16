/**
 * almond 0.2.3 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

/*!
 Lo-Dash 1.0.0-rc.3 lodash.com/license
 Underscore.js 1.4.3 underscorejs.org/LICENSE
*/

//     (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

/**
 * Adapted from the official plugin text.js
 *
 * Uses UnderscoreJS micro-templates : http://documentcloud.github.com/underscore/#template
 * @author Julien Cabanès <julien@zeeagency.com>
 * @version 0.2
 * 
 * @license RequireJS text 0.24.0 Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

(function(t,e){function n(t){return t&&"object"==typeof t&&t.__wrapped__?t:this instanceof n?(this.__wrapped__=t,void 0):new n(t)}function i(t,e,n){e||(e=0);var i=t.length,r=i-e>=(n||ie);if(r)for(var s={},n=e-1;i>++n;){var o=t[n]+"";(je.call(s,o)?s[o]:s[o]=[]).push(t[n])}return function(n){if(r){var i=n+"";return je.call(s,i)&&D(s[i],n)>-1}return D(t,n,e)>-1}}function r(t){return t.charCodeAt(0)}function s(t,e){var n=t.b,i=e.b,t=t.a,e=e.a;if(t!==e){if(t>e||t===void 0)return 1;if(e>t||e===void 0)return-1}return i>n?-1:1}function o(t,e,n){function i(){var a=arguments,u=s?this:e;return r||(t=e[o]),n.length&&(a=a.length?n.concat(p(a)):n),this instanceof i?(f.prototype=t.prototype,u=new f,f.prototype=null,a=t.apply(u,a),j(a)?a:u):t.apply(u,a)}var r=x(t),s=!n,o=e;return s&&(n=e),r||(e=t),i}function a(t,e,n){return t?"function"!=typeof t?function(e){return e[t]}:e!==void 0?n?function(n,i,r,s){return t.call(e,n,i,r,s)}:function(n,i,r){return t.call(e,n,i,r)}:t:L}function u(){for(var t,e={b:"",c:"",e:K,f:Le,g:"",h:We,i:Ke,j:ye,k:"",l:!0},n=0;t=arguments[n];n++)for(var i in t)e[i]=t[i];if(t=e.a,e.d=/^[^,]+/.exec(t)[0],n=Function,i="var i,l="+e.d+",t="+e.d+";if(!"+e.d+")return t;"+e.k+";",e.b?(i+="var m=l.length;i=-1;if(typeof m=='number'){",e.i&&(i+="if(k(l)){l=l.split('')}"),i+="while(++i<m){"+e.b+"}}else {"):e.h&&(i+="var m=l.length;i=-1;if(m&&j(l)){while(++i<m){i+='';"+e.g+"}}else {"),e.e||(i+="var u=typeof l=='function'&&s.call(l,'prototype');"),e.f&&e.l?(i+="var q=-1,r=p[typeof l]?n(l):[],m=r.length;while(++q<m){i=r[q];",e.e||(i+="if(!(u&&i=='prototype')){"),i+=e.g+"",e.e||(i+="}")):(i+="for(i in l){",(!e.e||e.l)&&(i+="if(",e.e||(i+="!(u&&i=='prototype')"),!e.e&&e.l&&(i+="&&"),e.l&&(i+="h.call(l,i)"),i+="){"),i+=e.g+";",(!e.e||e.l)&&(i+="}")),i+="}",e.e){i+="var f=l.constructor;";for(var r=0;7>r;r++)i+="i='"+e.j[r]+"';if(","constructor"==e.j[r]&&(i+="!(f&&f.prototype===l)&&"),i+="h.call(l,i)){"+e.g+"}"}return(e.b||e.h)&&(i+="}"),i+=e.c+";return t",n("e,h,j,k,p,n,s","return function("+t+"){"+i+"}")(a,je,v,k,nn,Pe,ke)}function c(t){return"\\"+rn[t]}function l(t){return fn[t]}function h(t){return"function"!=typeof t.toString&&"string"==typeof(t+"")}function f(){}function p(t,e,n){e||(e=0),n===void 0&&(n=t?t.length:0);for(var i=-1,n=n-e||0,r=Array(0>n?0:n);n>++i;)r[i]=t[e+i];return r}function d(t){return pn[t]}function v(t){return Te.call(t)==Ne}function g(t){var e=!1;if(!t||"object"!=typeof t||v(t))return e;var n=t.constructor;return!x(n)&&(!Ze||!h(t))||n instanceof n?Z?(ln(t,function(t,n,i){return e=!je.call(i,n),!1}),!1===e):(ln(t,function(t,n){e=n}),!1===e||je.call(t,e)):e}function m(t){var e=[];return hn(t,function(t,n){e.push(n)}),e}function y(t,e,n,i,r){if(null==t)return t;if(n&&(e=!1),n=j(t)){var s=Te.call(t);if(!tn[s]||Ze&&h(t))return t;var o=vn(t)}if(!n||!e)return n?o?p(t):cn({},t):t;switch(n=en[s],s){case He:case Ie:return new n(+t);case ze:case Fe:return new n(t);case De:return n(t.source,le.exec(t))}for(i||(i=[]),r||(r=[]),s=i.length;s--;)if(i[s]==t)return r[s];var a=o?n(t.length):{};return i.push(t),r.push(a),(o?q:hn)(t,function(t,n){a[n]=y(t,e,null,i,r)}),o&&(je.call(t,"index")&&(a.index=t.index),je.call(t,"input")&&(a.input=t.input)),a}function b(t){var e=[];return ln(t,function(t,n){x(t)&&e.push(n)}),e.sort()}function _(t){var e={};return hn(t,function(t,n){e[t]=n}),e}function w(t,e,n,i){if(t===e)return 0!==t||1/t==1/e;if(null==t||null==e)return t===e;var r=Te.call(t),s=Te.call(e);if(r==Ne&&(r=Ue),s==Ne&&(s=Ue),r!=s)return!1;switch(r){case He:case Ie:return+t==+e;case ze:return t!=+t?e!=+e:0==t?1/t==1/e:t==+e;case De:case Fe:return t==e+""}if(s=r==Me,!s){if(t.__wrapped__||e.__wrapped__)return w(t.__wrapped__||t,e.__wrapped__||e);if(r!=Ue||Ze&&(h(t)||h(e)))return!1;var r=!Ge&&v(t)?Object:t.constructor,o=!Ge&&v(e)?Object:e.constructor;if(!(r==o||x(r)&&r instanceof r&&x(o)&&o instanceof o))return!1}for(n||(n=[]),i||(i=[]),r=n.length;r--;)if(n[r]==t)return i[r]==e;var a=!0,u=0;if(n.push(t),i.push(e),s){if(u=t.length,a=u==e.length)for(;u--&&(a=w(t[u],e[u],n,i)););return a}return ln(t,function(t,r,s){return je.call(s,r)?(u++,a=je.call(e,r)&&w(t,e[r],n,i)):void 0}),a&&ln(e,function(t,e,n){return je.call(n,e)?a=--u>-1:void 0}),a}function x(t){return"function"==typeof t}function j(t){return t?nn[typeof t]:!1}function $(t){return"number"==typeof t||Te.call(t)==ze}function k(t){return"string"==typeof t||Te.call(t)==Fe}function T(t,e,n){var i=arguments,r=0,s=2,o=i[3],a=i[4];for(n!==ne&&(o=[],a=[],"number"!=typeof n&&(s=i.length));s>++r;)hn(i[r],function(e,n){var i,r,s;if(e&&((r=vn(e))||gn(e))){for(var u=o.length;u--&&!(i=o[u]==e););i?t[n]=a[u]:(o.push(e),a.push((s=t[n],s=r?vn(s)?s:[]:gn(s)?s:{})),t[n]=T(s,e,ne,o,a))}else null!=e&&(t[n]=e)});return t}function E(t){var e=[];return hn(t,function(t){e.push(t)}),e}function S(t,e,n){var i=-1,r=t?t.length:0,s=!1,n=(0>n?qe(0,r+n):n)||0;return"number"==typeof r?s=(k(t)?t.indexOf(e,n):D(t,e,n))>-1:un(t,function(t){return++i>=n?!(s=t===e):void 0}),s}function O(t,e,n){var i=!0,e=a(e,n);if(vn(t))for(var n=-1,r=t.length;r>++n&&(i=!!e(t[n],n,t)););else un(t,function(t,n,r){return i=!!e(t,n,r)});return i}function A(t,e,n){var i=[],e=a(e,n);if(vn(t))for(var n=-1,r=t.length;r>++n;){var s=t[n];e(s,n,t)&&i.push(s)}else un(t,function(t,n,r){e(t,n,r)&&i.push(t)});return i}function P(t,e,n){var i,e=a(e,n);return q(t,function(t,n,r){return e(t,n,r)?(i=t,!1):void 0}),i}function q(t,e,n){if(e&&n===void 0&&vn(t))for(var n=-1,i=t.length;i>++n&&!1!==e(t[n],n,t););else un(t,e,n);return t}function R(t,e,n){var i=-1,r=t?t.length:0,s=Array("number"==typeof r?r:0),e=a(e,n);if(vn(t))for(;r>++i;)s[i]=e(t[i],i,t);else un(t,function(t,n,r){s[++i]=e(t,n,r)});return s}function C(t,e,n){var i=-1/0,s=-1,o=t?t.length:0,u=i;if(e||!vn(t))e=!e&&k(t)?r:a(e,n),un(t,function(t,n,r){n=e(t,n,r),n>i&&(i=n,u=t)});else for(;o>++s;)t[s]>u&&(u=t[s]);return u}function N(t,e){return R(t,e+"")}function M(t,e,n,i){var r=3>arguments.length,e=a(e,i,ne);if(vn(t)){var s=-1,o=t.length;for(r&&(n=t[++s]);o>++s;)n=e(n,t[s],s,t)}else un(t,function(t,i,s){n=r?(r=!1,t):e(n,t,i,s)});return n}function H(t,e,n,i){var r=t,s=t?t.length:0,o=3>arguments.length;if("number"!=typeof s)var u=mn(t),s=u.length;else Ke&&k(t)&&(r=t.split(""));return e=a(e,i,ne),q(t,function(t,i,a){i=u?u[--s]:--s,n=o?(o=!1,r[i]):e(n,r[i],i,a)}),n}function I(t,e,n){var i,e=a(e,n);if(vn(t))for(var n=-1,r=t.length;r>++n&&!(i=e(t[n],n,t)););else un(t,function(t,n,r){return!(i=e(t,n,r))});return!!i}function z(t,e,n){if(t){var i=t.length;return null==e||n?t[0]:p(t,0,Re(qe(0,e),i))}}function U(t,e){for(var n=-1,i=t?t.length:0,r=[];i>++n;){var s=t[n];vn(s)?$e.apply(r,e?s:U(s)):r.push(s)}return r}function D(t,e,n){var i=-1,r=t?t.length:0;if("number"==typeof n)i=(0>n?qe(0,r+n):n||0)-1;else if(n)return i=B(t,e),t[i]===e?i:-1;for(;r>++i;)if(t[i]===e)return i;return-1}function F(t,e,n){return p(t,null==e||n?1:qe(0,e))}function B(t,e,n,i){for(var r=0,s=t?t.length:r,n=n?a(n,i):L,e=n(e);s>r;)i=r+s>>>1,e>n(t[i])?r=i+1:s=i;return r}function V(t,e,n,i){var r=-1,s=t?t.length:0,o=[],u=o;"function"==typeof e&&(i=n,n=e,e=!1);var c=!e&&s>=75;if(c)var l={};for(n&&(u=[],n=a(n,i));s>++r;){var i=t[r],h=n?n(i,r,t):i;if(c)var f=h+"",f=je.call(l,f)?!(u=l[f]):u=l[f]=[];(e?!r||u[u.length-1]!==h:f||0>D(u,h))&&((n||c)&&u.push(h),o.push(i))}return o}function J(t,e){return Je||Ee&&arguments.length>2?Ee.call.apply(Ee,arguments):o(t,e,p(arguments,2))}function L(t){return t}function X(t){q(b(t),function(e){var i=n[e]=t[e];n.prototype[e]=function(){var t=[this.__wrapped__];return $e.apply(t,arguments),t=i.apply(n,t),new n(t)}})}function W(){return this.__wrapped__}var G="object"==typeof exports&&exports,Q="object"==typeof global&&global;Q.global===Q&&(t=Q);var K,Z,Y=[],te=new function(){},ee=0,ne=te,ie=30,re=t._,se=/[-?+=!~*%&^<>|{(\/]|\[\D|\b(?:delete|in|instanceof|new|typeof|void)\b/,oe=/&(?:amp|lt|gt|quot|#x27);/g,ae=/\b__p\+='';/g,ue=/\b(__p\+=)''\+/g,ce=/(__e\(.*?\)|\b__t\))\+'';/g,le=/\w*$/,he=/(?:__e|__t=)\(\s*(?![\d\s"']|this\.)/g,fe=RegExp("^"+(te.valueOf+"").replace(/[.*+?^=!:${}()|[\]\/\\]/g,"\\$&").replace(/valueOf|for [^\]]+/g,".+?")+"$"),pe=/\$\{((?:(?=\\?)\\?[\s\S])*?)}/g,de=/<%=([\s\S]+?)%>/g,ve=/($^)/,ge=/[&<>"']/g,me=/['\n\r\t\u2028\u2029\\]/g,ye="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" "),be=Math.ceil,_e=Y.concat,we=Math.floor,xe=fe.test(xe=Object.getPrototypeOf)&&xe,je=te.hasOwnProperty,$e=Y.push,ke=te.propertyIsEnumerable,Te=te.toString,Ee=fe.test(Ee=p.bind)&&Ee,Se=fe.test(Se=Array.isArray)&&Se,Oe=t.isFinite,Ae=t.isNaN,Pe=fe.test(Pe=Object.keys)&&Pe,qe=Math.max,Re=Math.min,Ce=Math.random,Ne="[object Arguments]",Me="[object Array]",He="[object Boolean]",Ie="[object Date]",ze="[object Number]",Ue="[object Object]",De="[object RegExp]",Fe="[object String]",Be=!!t.attachEvent,Ve=Ee&&!/\n|true/.test(Ee+Be),Je=Ee&&!Ve,Le=Pe&&(Be||Ve),Xe=(Xe={0:1,length:1},Y.splice.call(Xe,0,1),Xe[0]),We=!0;(function(){function t(){this.x=1}var e=[];t.prototype={valueOf:1,y:1};for(var n in new t)e.push(n);for(n in arguments)We=!n;K=!/valueOf/.test(e),Z="x"!=e[0]})(1);var Ge=arguments.constructor==Object,Qe=!v(arguments),Ke="xx"!="x"[0]+Object("x")[0];try{var Ze=Te.call(document)==Ue}catch(Ye){}var tn={"[object Function]":!1};tn[Ne]=tn[Me]=tn[He]=tn[Ie]=tn[ze]=tn[Ue]=tn[De]=tn[Fe]=!0;var en={};en[Me]=Array,en[He]=Boolean,en[Ie]=Date,en[Ue]=Object,en[ze]=Number,en[De]=RegExp,en[Fe]=String;var nn={"boolean":!1,"function":!0,object:!0,number:!1,string:!1,undefined:!1},rn={"\\":"\\","'":"'","\n":"n","\r":"r","	":"t","\u2028":"u2028","\u2029":"u2029"};n.templateSettings={escape:/<%-([\s\S]+?)%>/g,evaluate:/<%([\s\S]+?)%>/g,interpolate:de,variable:""};var sn={a:"o,v,g",k:"for(var a=1,b=typeof g=='number'?2:arguments.length;a<b;a++){if((l=arguments[a])){",g:"t[i]=l[i]",c:"}}"},on={a:"d,c,w",k:"c=c&&typeof w=='undefined'?c:e(c,w)",b:"if(c(l[i],i,d)===false)return t",g:"if(c(l[i],i,d)===false)return t"},an={b:null},un=u(on),cn=u(sn);Qe&&(v=function(t){return t?je.call(t,"callee"):!1});var ln=u(on,an,{l:!1}),hn=u(on,an),fn={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;"},pn=_(fn),dn=u(sn,{g:"if(t[i]==null)"+sn.g}),vn=Se||function(t){return Ge&&t instanceof Array||Te.call(t)==Me};x(/x/)&&(x=function(t){return t instanceof Function||"[object Function]"==Te.call(t)});var gn=xe?function(t){if(!t||"object"!=typeof t)return!1;var e=t.valueOf,n="function"==typeof e&&(n=xe(e))&&xe(n);return n?t==n||xe(t)==n&&!v(t):g(t)}:g,mn=Pe?function(t){return"function"==typeof t&&ke.call(t,"prototype")?m(t):j(t)?Pe(t):[]}:m;n.after=function(t,e){return 1>t?e():function(){return 1>--t?e.apply(this,arguments):void 0}},n.assign=cn,n.bind=J,n.bindAll=function(t){for(var e=arguments,n=e.length>1?0:(e=b(t),-1),i=e.length;i>++n;){var r=e[n];t[r]=J(t[r],t)}return t},n.bindKey=function(t,e){return o(t,e,p(arguments,2))},n.compact=function(t){for(var e=-1,n=t?t.length:0,i=[];n>++e;){var r=t[e];r&&i.push(r)}return i},n.compose=function(){var t=arguments;return function(){for(var e=arguments,n=t.length;n--;)e=[t[n].apply(this,e)];return e[0]}},n.countBy=function(t,e,n){var i={},e=a(e,n);return q(t,function(t,n,r){n=e(t,n,r),je.call(i,n)?i[n]++:i[n]=1}),i},n.debounce=function(t,e,n){function i(){a=null,n||(s=t.apply(o,r))}var r,s,o,a;return function(){var u=n&&!a;return r=arguments,o=this,clearTimeout(a),a=setTimeout(i,e),u&&(s=t.apply(o,r)),s}},n.defaults=dn,n.defer=function(t){var n=p(arguments,1);return setTimeout(function(){t.apply(e,n)},1)},n.delay=function(t,n){var i=p(arguments,2);return setTimeout(function(){t.apply(e,i)},n)},n.difference=function(t){for(var e=-1,n=t?t.length:0,r=_e.apply(Y,arguments),r=i(r,n),s=[];n>++e;){var o=t[e];r(o)||s.push(o)}return s},n.filter=A,n.flatten=U,n.forEach=q,n.forIn=ln,n.forOwn=hn,n.functions=b,n.groupBy=function(t,e,n){var i={},e=a(e,n);return q(t,function(t,n,r){n=e(t,n,r),(je.call(i,n)?i[n]:i[n]=[]).push(t)}),i},n.initial=function(t,e,n){if(!t)return[];var i=t.length;return p(t,0,Re(qe(0,i-(null==e||n?1:e||0)),i))},n.intersection=function(t){var e=arguments,n=e.length,r={0:{}},s=-1,o=t?t.length:0,a=o>=100,u=[],c=u;t:for(;o>++s;){var l=t[s];if(a)var h=l+"",h=je.call(r[0],h)?!(c=r[0][h]):c=r[0][h]=[];if(h||0>D(c,l)){a&&c.push(l);for(var f=n;--f;)if(!(r[f]||(r[f]=i(e[f],0,100)))(l))continue t;u.push(l)}}return u},n.invert=_,n.invoke=function(t,e){var n=p(arguments,2),i="function"==typeof e,r=[];return q(t,function(t){r.push((i?e:t[e]).apply(t,n))}),r},n.keys=mn,n.map=R,n.max=C,n.memoize=function(t,e){var n={};return function(){var i=e?e.apply(this,arguments):arguments[0];return je.call(n,i)?n[i]:n[i]=t.apply(this,arguments)}},n.merge=T,n.min=function(t,e,n){var i=1/0,s=-1,o=t?t.length:0,u=i;if(e||!vn(t))e=!e&&k(t)?r:a(e,n),un(t,function(t,n,r){n=e(t,n,r),i>n&&(i=n,u=t)});else for(;o>++s;)u>t[s]&&(u=t[s]);return u},n.object=function(t,e){for(var n=-1,i=t?t.length:0,r={};i>++n;){var s=t[n];e?r[s]=e[n]:r[s[0]]=s[1]}return r},n.omit=function(t,e,n){var i="function"==typeof e,r={};if(i)e=a(e,n);else var s=_e.apply(Y,arguments);return ln(t,function(t,n,o){(i?!e(t,n,o):0>D(s,n,1))&&(r[n]=t)}),r},n.once=function(t){var e,n=!1;return function(){return n?e:(n=!0,e=t.apply(this,arguments),t=null,e)}},n.pairs=function(t){var e=[];return hn(t,function(t,n){e.push([n,t])}),e},n.partial=function(t){return o(t,p(arguments,1))},n.pick=function(t,e,n){var i={};if("function"!=typeof e)for(var r=0,s=_e.apply(Y,arguments),o=s.length;o>++r;){var u=s[r];u in t&&(i[u]=t[u])}else e=a(e,n),ln(t,function(t,n,r){e(t,n,r)&&(i[n]=t)});return i},n.pluck=N,n.range=function(t,e,n){t=+t||0,n=+n||1,null==e&&(e=t,t=0);for(var i=-1,e=qe(0,be((e-t)/n)),r=Array(e);e>++i;)r[i]=t,t+=n;return r},n.reject=function(t,e,n){return e=a(e,n),A(t,function(t,n,i){return!e(t,n,i)})},n.rest=F,n.shuffle=function(t){var e=-1,n=Array(t?t.length:0);return q(t,function(t){var i=we(Ce()*(++e+1));n[e]=n[i],n[i]=t}),n},n.sortBy=function(t,e,n){var i=[],e=a(e,n);for(q(t,function(t,n,r){i.push({a:e(t,n,r),b:n,c:t})}),t=i.length,i.sort(s);t--;)i[t]=i[t].c;return i},n.tap=function(t,e){return e(t),t},n.throttle=function(t,e){function n(){a=new Date,o=null,r=t.apply(s,i)}var i,r,s,o,a=0;return function(){var u=new Date,c=e-(u-a);return i=arguments,s=this,0>=c?(clearTimeout(o),o=null,a=u,r=t.apply(s,i)):o||(o=setTimeout(n,c)),r}},n.times=function(t,e,n){for(var t=+t||0,i=-1,r=Array(t);t>++i;)r[i]=e.call(n,i);return r},n.toArray=function(t){return"number"==typeof(t?t.length:0)?Ke&&k(t)?t.split(""):p(t):E(t)},n.union=function(){return V(_e.apply(Y,arguments))},n.uniq=V,n.values=E,n.where=function(t,e){var n=mn(e);return A(t,function(t){for(var i=n.length;i--;){var r=t[n[i]]===e[n[i]];if(!r)break}return!!r})},n.without=function(t){for(var e=-1,n=t?t.length:0,r=i(arguments,1,20),s=[];n>++e;){var o=t[e];r(o)||s.push(o)}return s},n.wrap=function(t,e){return function(){var n=[t];return $e.apply(n,arguments),e.apply(this,n)}},n.zip=function(t){for(var e=-1,n=t?C(N(arguments,"length")):0,i=Array(n);n>++e;)i[e]=N(arguments,e);return i},n.collect=R,n.drop=F,n.each=q,n.extend=cn,n.methods=b,n.select=A,n.tail=F,n.unique=V,X(n),n.clone=y,n.cloneDeep=function(t){return y(t,!0)},n.contains=S,n.escape=function(t){return null==t?"":(t+"").replace(ge,l)},n.every=O,n.find=P,n.has=function(t,e){return t?je.call(t,e):!1},n.identity=L,n.indexOf=D,n.isArguments=v,n.isArray=vn,n.isBoolean=function(t){return!0===t||!1===t||Te.call(t)==He},n.isDate=function(t){return t instanceof Date||Te.call(t)==Ie},n.isElement=function(t){return t?1===t.nodeType:!1},n.isEmpty=function(t){var e=!0;if(!t)return e;var n=Te.call(t),i=t.length;return n==Me||n==Fe||n==Ne||Qe&&v(t)||n==Ue&&"number"==typeof i&&x(t.splice)?!i:(hn(t,function(){return e=!1}),e)},n.isEqual=w,n.isFinite=function(t){return Oe(t)&&!Ae(parseFloat(t))},n.isFunction=x,n.isNaN=function(t){return $(t)&&t!=+t},n.isNull=function(t){return null===t},n.isNumber=$,n.isObject=j,n.isPlainObject=gn,n.isRegExp=function(t){return t instanceof RegExp||Te.call(t)==De},n.isString=k,n.isUndefined=function(t){return t===void 0},n.lastIndexOf=function(t,e,n){var i=t?t.length:0;for("number"==typeof n&&(i=(0>n?qe(0,i+n):Re(n,i-1))+1);i--;)if(t[i]===e)return i;return-1},n.mixin=X,n.noConflict=function(){return t._=re,this},n.random=function(t,e){return null==t&&null==e&&(e=1),t=+t||0,null==e&&(e=t,t=0),t+we(Ce()*((+e||0)-t+1))},n.reduce=M,n.reduceRight=H,n.result=function(t,e){var n=t?t[e]:null;return x(n)?t[e]():n},n.size=function(t){var e=t?t.length:0;return"number"==typeof e?e:mn(t).length},n.some=I,n.sortedIndex=B,n.template=function(t,e,i){t||(t=""),i||(i={});var r,s,o=n.templateSettings,a=0,u=i.interpolate||o.interpolate||ve,l="__p+='",h=i.variable||o.variable,f=h;t.replace(RegExp((i.escape||o.escape||ve).source+"|"+u.source+"|"+(u===de?pe:ve).source+"|"+(i.evaluate||o.evaluate||ve).source+"|$","g"),function(e,n,i,s,o,u){return i||(i=s),l+=t.slice(a,u).replace(me,c),n&&(l+="'+__e("+n+")+'"),o&&(l+="';"+o+";__p+='"),i&&(l+="'+((__t=("+i+"))==null?'':__t)+'"),r||(r=o||se.test(n||i)),a=u+e.length,e}),l+="';\n",f||(h="obj",r?l="with("+h+"){"+l+"}":(i=RegExp("(\\(\\s*)"+h+"\\."+h+"\\b","g"),l=l.replace(he,"$&"+h+".").replace(i,"$1__d"))),l=(r?l.replace(ae,""):l).replace(ue,"$1").replace(ce,"$1;"),l="function("+h+"){"+(f?"":h+"||("+h+"={});")+"var __t,__p='',__e=_.escape"+(r?",__j=Array.prototype.join;function print(){__p+=__j.call(arguments,'')}":(f?"":",__d="+h+"."+h+"||"+h)+";")+l+"return __p}";try{s=Function("_","return "+l)(n)}catch(p){throw p.source=l,p}return e?s(e):(s.source=l,s)},n.unescape=function(t){return null==t?"":(t+"").replace(oe,d)},n.uniqueId=function(t){return(null==t?"":t+"")+ ++ee},n.all=O,n.any=I,n.detect=P,n.foldl=M,n.foldr=H,n.include=S,n.inject=M,hn(n,function(t,e){n.prototype[e]||(n.prototype[e]=function(){var e=[this.__wrapped__];return $e.apply(e,arguments),t.apply(n,e)})}),n.first=z,n.last=function(t,e,n){if(t){var i=t.length;return null==e||n?t[i-1]:p(t,qe(0,i-e))}},n.take=z,n.head=z,hn(n,function(t,e){n.prototype[e]||(n.prototype[e]=function(e,i){var r=t(this.__wrapped__,e,i);return null==e||i?r:new n(r)})}),n.VERSION="1.0.0-rc.3",n.prototype.toString=function(){return this.__wrapped__+""},n.prototype.value=W,n.prototype.valueOf=W,un(["join","pop","shift"],function(t){var e=Y[t];n.prototype[t]=function(){return e.apply(this.__wrapped__,arguments)}}),un(["push","reverse","sort","unshift"],function(t){var e=Y[t];n.prototype[t]=function(){return e.apply(this.__wrapped__,arguments),this}}),un(["concat","slice","splice"],function(t){var e=Y[t];n.prototype[t]=function(){var t=e.apply(this.__wrapped__,arguments);return new n(t)}}),Xe&&un(["pop","shift","splice"],function(t){var e=Y[t],i="splice"==t;n.prototype[t]=function(){var t=this.__wrapped__,r=e.apply(t,arguments);return 0===t.length&&delete t[0],i?new n(r):r}}),"function"==typeof define&&"object"==typeof define.amd&&define.amd?(t._=n,define("underscore",[],function(){return n})):G?"object"==typeof module&&module&&module.exports==G?(module.exports=n)._=n:G._=n:t._=n})(this),function(){var t,e=this,n=e.Backbone,i=[],r=i.push,s=i.slice,o=i.splice;t="undefined"!=typeof exports?exports:e.Backbone={},t.VERSION="0.9.10";var a=e._;a||"undefined"==typeof require||(a=require("underscore")),t.$=e.jQuery||e.Zepto||e.ender,t.noConflict=function(){return e.Backbone=n,this},t.emulateHTTP=!1,t.emulateJSON=!1;var u=/\s+/,c=function(t,e,n,i){if(!n)return!0;if("object"==typeof n)for(var r in n)t[e].apply(t,[r,n[r]].concat(i));else{if(!u.test(n))return!0;for(var s=n.split(u),o=0,a=s.length;a>o;o++)t[e].apply(t,[s[o]].concat(i))}},l=function(t,e){var n,i=-1,r=t.length;switch(e.length){case 0:for(;r>++i;)(n=t[i]).callback.call(n.ctx);return;case 1:for(;r>++i;)(n=t[i]).callback.call(n.ctx,e[0]);return;case 2:for(;r>++i;)(n=t[i]).callback.call(n.ctx,e[0],e[1]);return;case 3:for(;r>++i;)(n=t[i]).callback.call(n.ctx,e[0],e[1],e[2]);return;default:for(;r>++i;)(n=t[i]).callback.apply(n.ctx,e)}},h=t.Events={on:function(t,e,n){if(!c(this,"on",t,[e,n])||!e)return this;this._events||(this._events={});var i=this._events[t]||(this._events[t]=[]);return i.push({callback:e,context:n,ctx:n||this}),this},once:function(t,e,n){if(!c(this,"once",t,[e,n])||!e)return this;var i=this,r=a.once(function(){i.off(t,r),e.apply(this,arguments)});return r._callback=e,this.on(t,r,n),this},off:function(t,e,n){var i,r,s,o,u,l,h,f;if(!this._events||!c(this,"off",t,[e,n]))return this;if(!t&&!e&&!n)return this._events={},this;for(o=t?[t]:a.keys(this._events),u=0,l=o.length;l>u;u++)if(t=o[u],i=this._events[t]){if(s=[],e||n)for(h=0,f=i.length;f>h;h++)r=i[h],(e&&e!==r.callback&&e!==r.callback._callback||n&&n!==r.context)&&s.push(r);this._events[t]=s}return this},trigger:function(t){if(!this._events)return this;var e=s.call(arguments,1);if(!c(this,"trigger",t,e))return this;var n=this._events[t],i=this._events.all;return n&&l(n,e),i&&l(i,arguments),this},listenTo:function(t,e,n){var i=this._listeners||(this._listeners={}),r=t._listenerId||(t._listenerId=a.uniqueId("l"));return i[r]=t,t.on(e,"object"==typeof e?this:n,this),this},stopListening:function(t,e,n){var i=this._listeners;if(i){if(t)t.off(e,"object"==typeof e?this:n,this),e||n||delete i[t._listenerId];else{"object"==typeof e&&(n=this);for(var r in i)i[r].off(e,n,this);this._listeners={}}return this}}};h.bind=h.on,h.unbind=h.off,a.extend(t,h);var f=t.Model=function(t,e){var n,i=t||{};this.cid=a.uniqueId("c"),this.attributes={},e&&e.collection&&(this.collection=e.collection),e&&e.parse&&(i=this.parse(i,e)||{}),(n=a.result(this,"defaults"))&&(i=a.defaults({},i,n)),this.set(i,e),this.changed={},this.initialize.apply(this,arguments)};a.extend(f.prototype,h,{changed:null,idAttribute:"id",initialize:function(){},toJSON:function(){return a.clone(this.attributes)},sync:function(){return t.sync.apply(this,arguments)},get:function(t){return this.attributes[t]},escape:function(t){return a.escape(this.get(t))},has:function(t){return null!=this.get(t)},set:function(t,e,n){var i,r,s,o,u,c,l,h;if(null==t)return this;if("object"==typeof t?(r=t,n=e):(r={})[t]=e,n||(n={}),!this._validate(r,n))return!1;s=n.unset,u=n.silent,o=[],c=this._changing,this._changing=!0,c||(this._previousAttributes=a.clone(this.attributes),this.changed={}),h=this.attributes,l=this._previousAttributes,this.idAttribute in r&&(this.id=r[this.idAttribute]);for(i in r)e=r[i],a.isEqual(h[i],e)||o.push(i),a.isEqual(l[i],e)?delete this.changed[i]:this.changed[i]=e,s?delete h[i]:h[i]=e;if(!u){o.length&&(this._pending=!0);for(var f=0,p=o.length;p>f;f++)this.trigger("change:"+o[f],this,h[o[f]],n)}if(c)return this;if(!u)for(;this._pending;)this._pending=!1,this.trigger("change",this,n);return this._pending=!1,this._changing=!1,this},unset:function(t,e){return this.set(t,void 0,a.extend({},e,{unset:!0}))},clear:function(t){var e={};for(var n in this.attributes)e[n]=void 0;return this.set(e,a.extend({},t,{unset:!0}))},hasChanged:function(t){return null==t?!a.isEmpty(this.changed):a.has(this.changed,t)},changedAttributes:function(t){if(!t)return this.hasChanged()?a.clone(this.changed):!1;var e,n=!1,i=this._changing?this._previousAttributes:this.attributes;for(var r in t)a.isEqual(i[r],e=t[r])||((n||(n={}))[r]=e);return n},previous:function(t){return null!=t&&this._previousAttributes?this._previousAttributes[t]:null},previousAttributes:function(){return a.clone(this._previousAttributes)},fetch:function(t){t=t?a.clone(t):{},void 0===t.parse&&(t.parse=!0);var e=t.success;return t.success=function(t,n,i){return t.set(t.parse(n,i),i)?(e&&e(t,n,i),void 0):!1},this.sync("read",this,t)},save:function(t,e,n){var i,r,s,o,u=this.attributes;return null==t||"object"==typeof t?(i=t,n=e):(i={})[t]=e,!i||n&&n.wait||this.set(i,n)?(n=a.extend({validate:!0},n),this._validate(i,n)?(i&&n.wait&&(this.attributes=a.extend({},u,i)),void 0===n.parse&&(n.parse=!0),r=n.success,n.success=function(t,e,n){t.attributes=u;var s=t.parse(e,n);return n.wait&&(s=a.extend(i||{},s)),a.isObject(s)&&!t.set(s,n)?!1:(r&&r(t,e,n),void 0)},s=this.isNew()?"create":n.patch?"patch":"update","patch"===s&&(n.attrs=i),o=this.sync(s,this,n),i&&n.wait&&(this.attributes=u),o):!1):!1},destroy:function(t){t=t?a.clone(t):{};var e=this,n=t.success,i=function(){e.trigger("destroy",e,e.collection,t)};if(t.success=function(t,e,r){(r.wait||t.isNew())&&i(),n&&n(t,e,r)},this.isNew())return t.success(this,null,t),!1;var r=this.sync("delete",this,t);return t.wait||i(),r},url:function(){var t=a.result(this,"urlRoot")||a.result(this.collection,"url")||P();return this.isNew()?t:t+("/"===t.charAt(t.length-1)?"":"/")+encodeURIComponent(this.id)},parse:function(t){return t},clone:function(){return new this.constructor(this.attributes)},isNew:function(){return null==this.id},isValid:function(t){return!this.validate||!this.validate(this.attributes,t)},_validate:function(t,e){if(!e.validate||!this.validate)return!0;t=a.extend({},this.attributes,t);var n=this.validationError=this.validate(t,e)||null;return n?(this.trigger("invalid",this,n,e||{}),!1):!0}});var p=t.Collection=function(t,e){e||(e={}),e.model&&(this.model=e.model),void 0!==e.comparator&&(this.comparator=e.comparator),this.models=[],this._reset(),this.initialize.apply(this,arguments),t&&this.reset(t,a.extend({silent:!0},e))};a.extend(p.prototype,h,{model:f,initialize:function(){},toJSON:function(t){return this.map(function(e){return e.toJSON(t)})},sync:function(){return t.sync.apply(this,arguments)},add:function(t,e){t=a.isArray(t)?t.slice():[t],e||(e={});var n,i,s,u,c,l,h,f,p,d;for(h=[],f=e.at,p=this.comparator&&null==f&&0!=e.sort,d=a.isString(this.comparator)?this.comparator:null,n=0,i=t.length;i>n;n++)(s=this._prepareModel(u=t[n],e))?(c=this.get(s))?e.merge&&(c.set(u===s?s.attributes:u,e),p&&!l&&c.hasChanged(d)&&(l=!0)):(h.push(s),s.on("all",this._onModelEvent,this),this._byId[s.cid]=s,null!=s.id&&(this._byId[s.id]=s)):this.trigger("invalid",this,u,e);if(h.length&&(p&&(l=!0),this.length+=h.length,null!=f?o.apply(this.models,[f,0].concat(h)):r.apply(this.models,h)),l&&this.sort({silent:!0}),e.silent)return this;for(n=0,i=h.length;i>n;n++)(s=h[n]).trigger("add",s,this,e);return l&&this.trigger("sort",this,e),this},remove:function(t,e){t=a.isArray(t)?t.slice():[t],e||(e={});var n,i,r,s;for(n=0,i=t.length;i>n;n++)s=this.get(t[n]),s&&(delete this._byId[s.id],delete this._byId[s.cid],r=this.indexOf(s),this.models.splice(r,1),this.length--,e.silent||(e.index=r,s.trigger("remove",s,this,e)),this._removeReference(s));return this},push:function(t,e){return t=this._prepareModel(t,e),this.add(t,a.extend({at:this.length},e)),t},pop:function(t){var e=this.at(this.length-1);return this.remove(e,t),e},unshift:function(t,e){return t=this._prepareModel(t,e),this.add(t,a.extend({at:0},e)),t},shift:function(t){var e=this.at(0);return this.remove(e,t),e},slice:function(t,e){return this.models.slice(t,e)},get:function(t){return null==t?void 0:(this._idAttr||(this._idAttr=this.model.prototype.idAttribute),this._byId[t.id||t.cid||t[this._idAttr]||t])},at:function(t){return this.models[t]},where:function(t){return a.isEmpty(t)?[]:this.filter(function(e){for(var n in t)if(t[n]!==e.get(n))return!1;return!0})},sort:function(t){if(!this.comparator)throw Error("Cannot sort a set without a comparator");return t||(t={}),a.isString(this.comparator)||1===this.comparator.length?this.models=this.sortBy(this.comparator,this):this.models.sort(a.bind(this.comparator,this)),t.silent||this.trigger("sort",this,t),this},pluck:function(t){return a.invoke(this.models,"get",t)},update:function(t,e){e=a.extend({add:!0,merge:!0,remove:!0},e),e.parse&&(t=this.parse(t,e));var n,i,r,s,o=[],u=[],c={};if(a.isArray(t)||(t=t?[t]:[]),e.add&&!e.remove)return this.add(t,e);for(i=0,r=t.length;r>i;i++)n=t[i],s=this.get(n),e.remove&&s&&(c[s.cid]=!0),(e.add&&!s||e.merge&&s)&&o.push(n);if(e.remove)for(i=0,r=this.models.length;r>i;i++)n=this.models[i],c[n.cid]||u.push(n);return u.length&&this.remove(u,e),o.length&&this.add(o,e),this},reset:function(t,e){e||(e={}),e.parse&&(t=this.parse(t,e));for(var n=0,i=this.models.length;i>n;n++)this._removeReference(this.models[n]);return e.previousModels=this.models.slice(),this._reset(),t&&this.add(t,a.extend({silent:!0},e)),e.silent||this.trigger("reset",this,e),this},fetch:function(t){t=t?a.clone(t):{},void 0===t.parse&&(t.parse=!0);var e=t.success;return t.success=function(t,n,i){var r=i.update?"update":"reset";t[r](n,i),e&&e(t,n,i)},this.sync("read",this,t)},create:function(t,e){if(e=e?a.clone(e):{},!(t=this._prepareModel(t,e)))return!1;e.wait||this.add(t,e);var n=this,i=e.success;return e.success=function(t,e,r){r.wait&&n.add(t,r),i&&i(t,e,r)},t.save(null,e),t},parse:function(t){return t},clone:function(){return new this.constructor(this.models)},_reset:function(){this.length=0,this.models.length=0,this._byId={}},_prepareModel:function(t,e){if(t instanceof f)return t.collection||(t.collection=this),t;e||(e={}),e.collection=this;var n=new this.model(t,e);return n._validate(t,e)?n:!1},_removeReference:function(t){this===t.collection&&delete t.collection,t.off("all",this._onModelEvent,this)},_onModelEvent:function(t,e,n,i){("add"!==t&&"remove"!==t||n===this)&&("destroy"===t&&this.remove(e,i),e&&t==="change:"+e.idAttribute&&(delete this._byId[e.previous(e.idAttribute)],null!=e.id&&(this._byId[e.id]=e)),this.trigger.apply(this,arguments))},sortedIndex:function(t,e,n){e||(e=this.comparator);var i=a.isFunction(e)?e:function(t){return t.get(e)};return a.sortedIndex(this.models,t,i,n)}});var d=["forEach","each","map","collect","reduce","foldl","inject","reduceRight","foldr","find","detect","filter","select","reject","every","all","some","any","include","contains","invoke","max","min","toArray","size","first","head","take","initial","rest","tail","drop","last","without","indexOf","shuffle","lastIndexOf","isEmpty","chain"];a.each(d,function(t){p.prototype[t]=function(){var e=s.call(arguments);return e.unshift(this.models),a[t].apply(a,e)}});var v=["groupBy","countBy","sortBy"];a.each(v,function(t){p.prototype[t]=function(e,n){var i=a.isFunction(e)?e:function(t){return t.get(e)};return a[t](this.models,i,n)}});var g=t.Router=function(t){t||(t={}),t.routes&&(this.routes=t.routes),this._bindRoutes(),this.initialize.apply(this,arguments)},m=/\((.*?)\)/g,y=/(\(\?)?:\w+/g,b=/\*\w+/g,_=/[\-{}\[\]+?.,\\\^$|#\s]/g;a.extend(g.prototype,h,{initialize:function(){},route:function(e,n,i){return a.isRegExp(e)||(e=this._routeToRegExp(e)),i||(i=this[n]),t.history.route(e,a.bind(function(r){var s=this._extractParameters(e,r);i&&i.apply(this,s),this.trigger.apply(this,["route:"+n].concat(s)),this.trigger("route",n,s),t.history.trigger("route",this,n,s)},this)),this},navigate:function(e,n){return t.history.navigate(e,n),this},_bindRoutes:function(){if(this.routes)for(var t,e=a.keys(this.routes);null!=(t=e.pop());)this.route(t,this.routes[t])},_routeToRegExp:function(t){return t=t.replace(_,"\\$&").replace(m,"(?:$1)?").replace(y,function(t,e){return e?t:"([^/]+)"}).replace(b,"(.*?)"),RegExp("^"+t+"$")},_extractParameters:function(t,e){return t.exec(e).slice(1)}});var w=t.History=function(){this.handlers=[],a.bindAll(this,"checkUrl"),"undefined"!=typeof window&&(this.location=window.location,this.history=window.history)},x=/^[#\/]|\s+$/g,j=/^\/+|\/+$/g,$=/msie [\w.]+/,k=/\/$/;w.started=!1,a.extend(w.prototype,h,{interval:50,getHash:function(t){var e=(t||this).location.href.match(/#(.*)$/);return e?e[1]:""},getFragment:function(t,e){if(null==t)if(this._hasPushState||!this._wantsHashChange||e){t=this.location.pathname;var n=this.root.replace(k,"");t.indexOf(n)||(t=t.substr(n.length))}else t=this.getHash();return t.replace(x,"")},start:function(e){if(w.started)throw Error("Backbone.history has already been started");w.started=!0,this.options=a.extend({},{root:"/"},this.options,e),this.root=this.options.root,this._wantsHashChange=this.options.hashChange!==!1,this._wantsPushState=!!this.options.pushState,this._hasPushState=!!(this.options.pushState&&this.history&&this.history.pushState);var n=this.getFragment(),i=document.documentMode,r=$.exec(navigator.userAgent.toLowerCase())&&(!i||7>=i);
this.root=("/"+this.root+"/").replace(j,"/"),r&&this._wantsHashChange&&(this.iframe=t.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo("body")[0].contentWindow,this.navigate(n)),this._hasPushState?t.$(window).on("popstate",this.checkUrl):this._wantsHashChange&&"onhashchange"in window&&!r?t.$(window).on("hashchange",this.checkUrl):this._wantsHashChange&&(this._checkUrlInterval=setInterval(this.checkUrl,this.interval)),this.fragment=n;var s=this.location,o=s.pathname.replace(/[^\/]$/,"$&/")===this.root;return this._wantsHashChange&&this._wantsPushState&&!this._hasPushState&&!o?(this.fragment=this.getFragment(null,!0),this.location.replace(this.root+this.location.search+"#"+this.fragment),!0):(this._wantsPushState&&this._hasPushState&&o&&s.hash&&(this.fragment=this.getHash().replace(x,""),this.history.replaceState({},document.title,this.root+this.fragment+s.search)),this.options.silent?void 0:this.loadUrl())},stop:function(){t.$(window).off("popstate",this.checkUrl).off("hashchange",this.checkUrl),clearInterval(this._checkUrlInterval),w.started=!1},route:function(t,e){this.handlers.unshift({route:t,callback:e})},checkUrl:function(){var t=this.getFragment();return t===this.fragment&&this.iframe&&(t=this.getFragment(this.getHash(this.iframe))),t===this.fragment?!1:(this.iframe&&this.navigate(t),this.loadUrl()||this.loadUrl(this.getHash()),void 0)},loadUrl:function(t){var e=this.fragment=this.getFragment(t),n=a.any(this.handlers,function(t){return t.route.test(e)?(t.callback(e),!0):void 0});return n},navigate:function(t,e){if(!w.started)return!1;if(e&&e!==!0||(e={trigger:e}),t=this.getFragment(t||""),this.fragment!==t){this.fragment=t;var n=this.root+t;if(this._hasPushState)this.history[e.replace?"replaceState":"pushState"]({},document.title,n);else{if(!this._wantsHashChange)return this.location.assign(n);this._updateHash(this.location,t,e.replace),this.iframe&&t!==this.getFragment(this.getHash(this.iframe))&&(e.replace||this.iframe.document.open().close(),this._updateHash(this.iframe.location,t,e.replace))}e.trigger&&this.loadUrl(t)}},_updateHash:function(t,e,n){if(n){var i=t.href.replace(/(javascript:|#).*$/,"");t.replace(i+"#"+e)}else t.hash="#"+e}}),t.history=new w;var T=t.View=function(t){this.cid=a.uniqueId("view"),this._configure(t||{}),this._ensureElement(),this.initialize.apply(this,arguments),this.delegateEvents()},E=/^(\S+)\s*(.*)$/,S=["model","collection","el","id","attributes","className","tagName","events"];a.extend(T.prototype,h,{tagName:"div",$:function(t){return this.$el.find(t)},initialize:function(){},render:function(){return this},remove:function(){return this.$el.remove(),this.stopListening(),this},setElement:function(e,n){return this.$el&&this.undelegateEvents(),this.$el=e instanceof t.$?e:t.$(e),this.el=this.$el[0],n!==!1&&this.delegateEvents(),this},delegateEvents:function(t){if(t||(t=a.result(this,"events"))){this.undelegateEvents();for(var e in t){var n=t[e];if(a.isFunction(n)||(n=this[t[e]]),!n)throw Error('Method "'+t[e]+'" does not exist');var i=e.match(E),r=i[1],s=i[2];n=a.bind(n,this),r+=".delegateEvents"+this.cid,""===s?this.$el.on(r,n):this.$el.on(r,s,n)}}},undelegateEvents:function(){this.$el.off(".delegateEvents"+this.cid)},_configure:function(t){this.options&&(t=a.extend({},a.result(this,"options"),t)),a.extend(this,a.pick(t,S)),this.options=t},_ensureElement:function(){if(this.el)this.setElement(a.result(this,"el"),!1);else{var e=a.extend({},a.result(this,"attributes"));this.id&&(e.id=a.result(this,"id")),this.className&&(e["class"]=a.result(this,"className"));var n=t.$("<"+a.result(this,"tagName")+">").attr(e);this.setElement(n,!1)}}});var O={create:"POST",update:"PUT",patch:"PATCH","delete":"DELETE",read:"GET"};t.sync=function(e,n,i){var r=O[e];a.defaults(i||(i={}),{emulateHTTP:t.emulateHTTP,emulateJSON:t.emulateJSON});var s={type:r,dataType:"json"};if(i.url||(s.url=a.result(n,"url")||P()),null!=i.data||!n||"create"!==e&&"update"!==e&&"patch"!==e||(s.contentType="application/json",s.data=JSON.stringify(i.attrs||n.toJSON(i))),i.emulateJSON&&(s.contentType="application/x-www-form-urlencoded",s.data=s.data?{model:s.data}:{}),i.emulateHTTP&&("PUT"===r||"DELETE"===r||"PATCH"===r)){s.type="POST",i.emulateJSON&&(s.data._method=r);var o=i.beforeSend;i.beforeSend=function(t){return t.setRequestHeader("X-HTTP-Method-Override",r),o?o.apply(this,arguments):void 0}}"GET"===s.type||i.emulateJSON||(s.processData=!1);var u=i.success;i.success=function(t){u&&u(n,t,i),n.trigger("sync",n,t,i)};var c=i.error;i.error=function(t){c&&c(n,t,i),n.trigger("error",n,t,i)};var l=i.xhr=t.ajax(a.extend(s,i));return n.trigger("request",n,l,i),l},t.ajax=function(){return t.$.ajax.apply(t.$,arguments)};var A=function(t,e){var n,i=this;n=t&&a.has(t,"constructor")?t.constructor:function(){return i.apply(this,arguments)},a.extend(n,i,e);var r=function(){this.constructor=n};return r.prototype=i.prototype,n.prototype=new r,t&&a.extend(n.prototype,t),n.__super__=i.prototype,n};f.extend=p.extend=g.extend=T.extend=w.extend=A;var P=function(){throw Error('A "url" property or function must be specified')}}.call(this),define("backbone",["underscore"],function(t){return function(){var e;return e||t.Backbone}}(this)),function(){var t=["Msxml2.XMLHTTP","Microsoft.XMLHTTP","Msxml2.XMLHTTP.4.0"],e=/^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,n=/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,i=[],r={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g},s=function(t){var e=r,n="var __p=[],print=function(){__p.push.apply(__p,arguments);};with(obj||{}){__p.push('"+t.replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(e.interpolate,function(t,e){return"',"+e.replace(/\\'/g,"'")+",'"}).replace(e.evaluate||null,function(t,e){return"');"+e.replace(/\\'/g,"'").replace(/[\r\n\t]/g," ")+"; __p.push('"}).replace(/\r/g,"").replace(/\n/g,"").replace(/\t/g,"")+"');}return __p.join('');";return n};define("tpl",[],function(){var r,o,a;return"undefined"!=typeof window&&window.navigator&&window.document?o=function(t,e){var n=r.createXhr();n.open("GET",t,!0),n.onreadystatechange=function(){4===n.readyState&&e(n.responseText)},n.send(null)}:"undefined"!=typeof process&&process.versions&&process.versions.node&&(a=require.nodeRequire("fs"),o=function(t,e){e(a.readFileSync(t,"utf8"))}),r={version:"0.24.0",strip:function(t){if(t){t=t.replace(e,"");var i=t.match(n);i&&(t=i[1])}else t="";return t},jsEscape:function(t){return t.replace(/(['\\])/g,"\\$1").replace(/[\f]/g,"\\f").replace(/[\b]/g,"\\b").replace(/[\n]/g,"").replace(/[\t]/g,"").replace(/[\r]/g,"")},createXhr:function(){var e,n,i;if("undefined"!=typeof XMLHttpRequest)return new XMLHttpRequest;for(n=0;3>n;n++){i=t[n];try{e=new ActiveXObject(i)}catch(r){}if(e){t=[i];break}}if(!e)throw Error("require.getXhr(): XMLHttpRequest not available");return e},get:o,load:function(t,e,n,o){var a,u=!1,c=t.indexOf("."),l=t.substring(0,c),h=t.substring(c+1,t.length);c=h.indexOf("!"),-1!==c&&(u=h.substring(c+1,h.length),u="strip"===u,h=h.substring(0,c)),a="nameToUrl"in e?e.nameToUrl(l,"."+h):e.toUrl(l+"."+h),r.get(a,function(e){e=s(e),o.isBuild||(e=Function("obj",e)),e=u?r.strip(e):e,o.isBuild&&o.inlineText&&(i[t]=e),n(e)})},write:function(t,e,n){if(e in i){var s=r.jsEscape(i[e]);n("define('"+t+"!"+e+"', function() {return function(obj) { "+s.replace(/(\\')/g,"'").replace(/(\\\\)/g,"\\")+"}});\n")}}}})}(),define("tpl!templates/item.html",function(){return function(obj){var __p=[];with(obj||{})__p.push(""),"undefined"!=typeof metadata&&(__p.push("  <h2>",metadata.get("title"),"</h2>  "),metadata.get("artwork_url")&&__p.push('  <img src="',metadata.get("artwork_url"),'"/>  '),__p.push("")),__p.push("<p>",get("url"),'</p><div class="controls">  <a href="#" data-action="destroy" class="icon-circle-blank"></a></div>');return __p.join("")}}),define("views/playlist/item",["underscore","backbone","tpl!templates/item.html"],function(t,e,n){return e.View.extend({tagName:"li",id:function(){return"item"+this.model.cid},initialize:function(t){if(this.parent=t.parent,!this.model)throw Error("Requires a model");this.render(),this.parent.$(".ghost").before(this.el),this.listenTo(this.model,"change",this.render),this.listenTo(this.model,"activate",this.activate)},render:function(){this.$el.attr("draggable",!0).html(n(this.model))},activate:function(){this.parent.$(".js-active").removeClass("js-active"),this.$el.addClass("js-active")},events:{click:"play",'click [data-action="destroy"]':"destroy"},play:function(){this.model.trigger("activate",!0)},destroy:function(t){t.preventDefault(),this.model.destroy()}})}),define("views/playlist/playlist",["underscore","backbone","views/playlist/item"],function(t,e,n){return e.View.extend({el:$("#playlist"),initialize:function(){if(!this.collection)throw Error("Requires a collection");this.listenTo(this.collection,"add",this.add)},add:function(t){t.view=new n({model:t,parent:this})},events:{"dragstart .ghost":"ghostDrag",'drop [draggable="true"]':"drop",'dragend [draggable="true"]':"dragEnd",'dragover [draggable="true"]':"dragOver",'dragstart [draggable="true"]':"dragStart",'dragleave [draggable="true"]':"dragLeave"},drop:function(t){t.stopPropagation&&t.stopPropagation(),t.preventDefault();var e=$("#"+t.originalEvent.dataTransfer.getData("Text"));return $(t.currentTarget).removeClass("drag-over").before(e),this.collection.trigger("usersort"),!1},dragStart:function(t){$(t.currentTarget).addClass("dragging"),t.originalEvent.dataTransfer.setData("Text",t.currentTarget.id),t.originalEvent.dataTransfer.dropEffect="move"},dragEnd:function(t){$(t.currentTarget).removeClass("dragging")},ghostDrag:function(t){t.preventDefault()},dragOver:function(t){return t.preventDefault&&t.preventDefault(),$(t.currentTarget).addClass("drag-over"),!1},dragLeave:function(t){$(t.currentTarget).removeClass("drag-over")},load:function(t){this.collection.reset(),this.collection.playlist.set("id",t);var e=this.collection.playlist.fetch();return e}})}),define("views/playlist/welcome",["underscore","backbone"],function(t,e){return e.View.extend({el:$(".welcome"),events:{'click [data-action="destroy"]':"remove"}})}),define("views/video/item",["underscore","backbone"],function(t,e){return e.View.extend({className:"media-item js-hidden",id:function(){return"video-"+this.model.cid},initialize:function(t){var e=this;if(this.parent=t.parent,!this.parent)throw Error("Requires a Parent view");if(!this.model)throw Error("Requires a model");this.dfd=$.Deferred(),this.render(),this.listenTo(this.model,"activate",this.activate),(0===this.model.collection.where({active:!0}).length||this.model.get("active"))&&(this.model.set("active",!0),setTimeout(function(){e.model.trigger("activate",!0)},0))},createPop:function(){this.pop=Popcorn.smart("#"+this.id(),this.model.get("url"),{controls:!0,width:940,height:480}),this.listeners()},listeners:function(){var n=this;this.pop.on("canplay",t.once(this.ready).bind(this)),t.each(["playing","pause"],function(t){this.pop.on(t,function(){n.model.get("active")&&e.trigger(t,n.model)})},this),this.pop.on("pause",function(){e.trigger("pause",this.model)},this);var i=0;this.pop.on("timeupdate",function(){var t=n.pop.currentTime();t!==i&&(n.parent.trigger("timeupdate",t),i=t)})},ready:function(){var t=this;t.parent.active!==t.model&&t.$el.addClass("js-hidden"),t.$el.addClass("js-loaded"),t.pop.cue(t.pop.duration()-1,function(){setTimeout(function(){t.model.collection.next(t.model)},1e3)}),t.dfd.resolve()},activate:function(t){var e=this;this.createPop(),this.model.collection.each(function(t){t.video&&t!==e&&t.video.hide()}),t&&this.play(),this.$el.addClass("js-active").removeClass("js-hidden"),this.parent.active=this},render:function(){this.$el.addClass(this.model.get("flavor")),this.parent.$el.append(this.el)},hide:function(){this.pop&&this.pop.pause(),this.$el.addClass("js-hidden").removeClass("js-active")},play:function(){this.pop||this.createPop();var t=this;this.dfd.done(function(){t.$el.removeClass("js-hidden"),setTimeout(function(){"0"!==localStorage.currentTime?(t.pop.play(localStorage.currentTime),localStorage.currentTime=0):t.pop.play()},100)})},remove:function(){this.pop&&(this.pop.pause(),this.pop.destroy()),e.View.prototype.remove.call(this)}})}),define("views/video/controls",["underscore","backbone"],function(t,e){return e.View.extend({el:function(){return this.options.parent.$(".controls")[0]},initialize:function(t){if(this.parent=t.parent,!this.parent)throw Error("Requires a Parent view")},events:{"click [data-action]":"controls"},controls:function(t){t.preventDefault();var e=$(t.currentTarget).data("action"),n=this.parent.active;n&&n.pop[e]&&n.pop[e](),"next"===e&&this.parent.collection.next()}})}),define("views/video/scrubber",["underscore","backbone"],function(t,e){return e.View.extend({el:$("#scrubber"),initialize:function(){if(this.parent=this.options.parent,!this.parent)throw Error("Requires parent view");this.listenTo(this.parent,"timeupdate",this.update),this.listenTo(e,"playing",this.setHandleWidth),this.handle=this.$(".handle"),this.scrubberWidth=this.$el.width()},events:{"mousedown .handle":"drag",click:"setPosition","click .handle":function(){return!1}},update:function(t){var e=t*this.scrubberWidth/this.duration;this.handle.css("left",~~(e-this.handleWidth))},setHandleWidth:function(t){this.duration=t.video.pop.duration(),this.handleWidth=this.duration/100,this.handle.css("width",~~this.handleWidth+"%");var e=t.metadata?t.metadata.get("title"):t.get("url");this.$("marquee").text(e)},setPosition:function(t){if(t.preventDefault(),t.stopPropagation(),!this.parent.active)return!1;var e=t.pageX-this.$el.offset().left-this.handleWidth;this.scrub(e*this.duration/this.scrubberWidth)},drag:function(t){function e(t){var e=t.pageX-s-i.handleWidth;r.css("left",e),i.scrub(e*i.duration/i.scrubberWidth)}function n(){$(this).off(".scrubber")}if(t.preventDefault(),t.stopPropagation(),!this.parent.active)return!1;var i=this,r=this.handle,s=this.$el.offset().left;$(window).on("mousemove.scrubber",e).one("mouseup.scrubber",n)},scrub:function(t){this.parent.active.pop.currentTime(t)}})}),define("views/video/video",["underscore","backbone","views/video/item","views/video/controls","views/video/scrubber"],function(t,e,n,i,r){return e.View.extend({el:$("#video"),initialize:function(){if(!this.collection)throw Error("Requires a collection");this.controls=new i({parent:this}),this.scrubber=new r({parent:this}),this.listenTo(this.collection,"add",this.add),this.listenTo(this.collection,"activated",this.update)},add:function(t){t.video=new n({model:t,parent:this})},update:function(t){this.$el.removeClass().addClass(t.get("flavor"))}})}),function(t){var e=decodeURIComponent;t.deparam=function(n,i){var r={},s={"true":!0,"false":!1,"null":null};return t.each(n.replace(/\+/g," ").split("&"),function(n,o){var a,u=o.split("="),c=e(u[0]),l=r,h=0,f=c.split("]["),p=f.length-1;if(/\[/.test(f[0])&&/\]$/.test(f[p])?(f[p]=f[p].replace(/\]$/,""),f=f.shift().split("[").concat(f),p=f.length-1):p=0,2===u.length)if(a=e(u[1]),i&&(a=a&&!isNaN(a)?+a:"undefined"===a?void 0:void 0!==s[a]?s[a]:a),p)for(;p>=h;h++)c=""===f[h]?l.length:f[h],l=l[c]=p>h?l[c]||(f[h+1]&&isNaN(f[h+1])?{}:[]):a;else t.isArray(r[c])?r[c].push(a):r[c]=void 0!==r[c]?[r[c],a]:a;else c&&(r[c]=i?void 0:"")}),r}}(jQuery),define("plugins/jquery.deparam",function(){}),define("views/form",["underscore","backbone","plugins/jquery.deparam"],function(t,e){return e.View.extend({initialize:function(){if(!this.collection)throw Error("Requires a collection")},el:$("#add-video"),events:{"submit form":"addVideo"},addVideo:function(t){t.preventDefault();var e=$.deparam(this.$("form").serialize());this.collection.add(e,{parse:!0})&&this.$("textarea").val("")}})}),define("models/youtube",["underscore","backbone"],function(t,e){var n="https://gdata.youtube.com/feeds/api/videos/";return e.Model.extend({initialize:function(t,e){if(this.parent=e.parent,!this.parent)throw Error("Requires a parent model");this.parseUrl(),this.fetch({dataType:"jsonp"})},parseUrl:function(){var t=this.parent.get("url"),e=$.deparam(t.split("?")[1]);e.v&&this.set("id",e.v)},url:function(){return n+this.get("id")+"?v=2&alt=json"},parse:function(t){var e={title:t.entry.title.$t};return t.entry.media$group.media$thumbnail&&(e.artwork_url=t.entry.media$group.media$thumbnail[0].url),e}})}),define("models/soundcloud",["underscore","backbone"],function(t,e){var n="?client_id=ac5ef8ec404bffaca78104a838599d91";return e.Model.extend({initialize:function(t,e){if(this.parent=e.parent,!this.parent)throw Error("Requires a parent model");this.fetch({dataType:"jsonp"})},url:function(){return this.parent.get("url")+".json"+n}})}),define("models/vimeo",["underscore","backbone"],function(t,e){var n="http://vimeo.com/api/v2/video/";return e.Model.extend({initialize:function(t,e){if(this.parent=e.parent,!this.parent)throw Error("Requires a parent model");this.parseUrl(),this.fetch({dataType:"jsonp"})},parseUrl:function(){var t=/vimeo.com\/(\S+)/.exec(this.parent.get("url"));t[1]&&this.set("id",t[1])},url:function(){return n+this.get("id")+".json"},parse:function(t){var e=t[0];return e.artwork_url=e.thumbnail_medium,e}})}),define("models/media",["underscore","backbone","models/youtube","models/soundcloud","models/vimeo"],function(t,e,n,i,r){var s={youtube:/youtube/,vimeo:/vimeo/,soundcloud:/soundcloud/},o={soundcloud:/^\[soundcloud\ url\="([^"]+)/,iframe:/^<iframe/,youtube:/youtube.com\/embed\/([^"]+)/};return e.Model.extend({initialize:function(){var t=this;this.get("type")||this.setType(),this.setMetadata(),this.on("activate",function(){this.set("active",!0),this.collection&&(this.collection.each(function(e){e.cid!==t.cid&&e.set("active",!1)}),this.collection.trigger("activated",this))},this),this.on("change:order",function(){this.save()},this)},destroy:function(){this.view.remove(),this.video&&this.video.remove(),this.get("active")&&this.collection.next(this),1===this.collection.length&&e.trigger("pause"),e.Model.prototype.destroy.call(this)},toJSON:function(){var e={media:t.clone(this.attributes)};return e.media.playlist_id=this.collection.playlist.id,e},setType:function(){t.find(s,function(t,e){return t.test(this.get("url"))?(this.set("flavor",e),!0):void 0},this)},setMetadata:function(){var t=this.get("flavor");"youtube"===t&&(this.metadata=new n(null,{parent:this}),this.set("url",this.get("url")+"&rel=0&controls=0")),"soundcloud"===t&&(this.metadata=new i(null,{parent:this})),"vimeo"===t&&(this.metadata=new r(null,{parent:this})),this.metadata&&this.metadata.on("change",function(){this.trigger("change")},this)},parse:function(t){var e;return(e=o.soundcloud.exec(t.url))&&(t.url=e[1]),o.iframe.test(t.url)&&(e=t.url.match(o.youtube))&&(e="http://youtube.com/?v="+e[1],t.url=e),t}})}),define("models/playlist",["underscore","backbone"],function(t,e){var n="http://api.playr.dev:3000/playlists";return e.Model.extend({initialize:function(t,e){if(this.parent=e.parent,!this.parent)throw Error("Requires a parent collection")},url:function(){var t=n;return this.id&&(t+="/"+this.id),t},sync:function(n,i,r){return t.defaults(r,{xhrFields:{withCredentials:!0}}),e.sync(n,i,r)},toJSON:function(){var e=t.clone(this.attributes);return e.items_attributes=this.parent.toJSON(),{playlist:e}},parse:function(e){var n=t.omit(e,"items");return e.items&&this.parent.update(e.items),n}})}),define("collections/media",["underscore","backbone","models/media","models/playlist"],function(t,e,n,i){return e.Collection.extend({model:n,initialize:function(){this.on("add",function(t){t.get("order")||t.set("order",this.indexOf(t),{silent:!0})},this),this.on("usersort",this.userSort),this.playlist=new i(null,{parent:this})},url:function(){return this.playlist.url()+"/media"},userSort:function(){this.each(function(t){var e=t.view.$el.index()-1;t.set({order:e})}),this.sort()},comparator:function(t){return t.get("order")},toJSON:function(){return this.map(function(e){return t.clone(e.attributes)})},next:function(t){var e=t?t:this.where({active:!0})[0];if(!e)return!1;var n=this.indexOf(e),i=n+1===this.length?0:n+1;this.at(i).trigger("activate",!0)}})}),define("router",["underscore","backbone"],function(t,e){return e.Router.extend({initialize:function(t){if(this.app=t.app,!this.app)throw Error("Requires an application instance")},routes:{"playlist/:id":"showPlaylist"},showPlaylist:function(t){this.app.playlist.load(t)}})}),define("playr",["underscore","backbone","views/playlist/playlist","views/playlist/welcome","views/video/video","views/form","collections/media","router"],function(t,e,n,i,r,s,o,a){var u=e.View.extend({el:$("body"),initialize:function(){this.collection=new o,this.welcomeMessage=new i;var t={collection:this.collection};this.video=new r(t),this.form=new s(t),this.playlist=new n(t),this.router=new a({app:this}),this.listenTo(e,"playing",this.playing),this.listenTo(e,"pause",this.pause),this.focusAdd()},events:{click:"focusAdd"},playing:function(){this.$el.addClass("playing")},pause:function(){this.$el.removeClass("playing")},focusAdd:function(){setTimeout(t.bind(function(){this.$("textarea").select()},this),200)}});return u}),require(["backbone","playr"],function(t,e){$(function(){window.Playr=new e,t.history.start()})}),define("main",function(){}),require.config({deps:["main"],paths:{vendor:"../assets/js/vendor",plugins:"../assets/js/plugins",popcorn:"../assets/js/vendor/popcorn",backbone:"../assets/js/vendor/backbone",underscore:"../assets/js/vendor/lodash.min",tpl:"../assets/js/plugins/tpl",text:"../assets/js/plugins/text",json:"../assets/js/plugins/json"},shim:{backbone:{exports:"Backbone",deps:["underscore"]},"plugins/jquery.deparam":[],"popcorn/popcorn-complete.min":{exports:"Popcorn"}}}),define("config",function(){});