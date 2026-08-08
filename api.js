/**
 * PWA API Bridge for Google Apps Script WebApp
 * Connects GitHub Pages Frontend via fetch() HTTP POST/GET to GAS ContentService API
 */
(function (window) {
  'use strict';

  // Default GAS WebApp Executable URL (Can be changed by Admin in UI)
  var DEFAULT_GAS_URL = localStorage.getItem('GAS_WEBAPP_URL') || '';

  var GasAPI = {
    getUrl: function () {
      return localStorage.getItem('GAS_WEBAPP_URL') || DEFAULT_GAS_URL;
    },
    setUrl: function (url) {
      if (url) {
        url = url.trim();
        localStorage.setItem('GAS_WEBAPP_URL', url);
      }
    },
    call: function (actionName) {
      var args = Array.prototype.slice.call(arguments, 1);
      var gasUrl = this.getUrl();

      if (!gasUrl) {
        // If native google.script.run is available (running inside Apps Script WebApp frame), fallback to it
        if (window.google && window.google.script && window.google.script.run) {
          return new Promise(function (resolve, reject) {
            var runner = window.google.script.run
              .withSuccessHandler(function (res) { resolve(res); })
              .withFailureHandler(function (err) { reject(err); });
            if (runner[actionName]) {
              runner[actionName].apply(runner, args);
            } else {
              reject(new Error("Function " + actionName + " not found on server."));
            }
          });
        }

        return Promise.reject(new Error("URL Google Apps Script WebApp belum diatur. Silakan atur WebApp URL di menu Setelan."));
      }

      var payload = {
        action: actionName,
        args: args
      };

      // Use fetch() with POST request
      // GAS WebApp returns 302 redirect to googleusercontent.com which fetch() follows automatically
      return fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("HTTP Error status: " + response.status);
          }
          return response.json();
        })
        .catch(function (err) {
          console.error('[GasAPI Error]', actionName, err);
          // Fallback GET request if POST is blocked by CORS/Proxy
          var encodedArgs = encodeURIComponent(JSON.stringify(args));
          var getUrl = gasUrl + '?action=' + encodeURIComponent(actionName) + '&args=' + encodedArgs;
          return fetch(getUrl)
            .then(function (res) { return res.json(); })
            .catch(function () {
              throw new Error("Gagal terhubung ke Google Apps Script backend. Pastikan WebApp URL sudah di-deploy dengan akses 'Anyone'.");
            });
        });
    }
  };

  // Global gasRun compatibility layer
  // Wraps GasAPI.call so existing page code calling gasRun('function', arg1, arg2) works transparently!
  window.gasRun = function (actionName) {
    var args = Array.prototype.slice.call(arguments, 1);
    return GasAPI.call.apply(GasAPI, [actionName].concat(args));
  };

  window.GasAPI = GasAPI;

})(window);
