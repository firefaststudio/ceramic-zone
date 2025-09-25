const express = require('express');
function checkPath(p) {
  try {
    if (typeof p === 'string' && /https?:\/\//.test(p)) {
      console.error('BAD_ROUTE_REGISTRATION', p);
      console.error(new Error().stack);
      process.exit(2);
    }
  } catch (e) { }
}

const app = express();
const origAppGet = app.get; const origAppUse = app.use;
app.get = function (path) { console.log('APP GET', path); checkPath(path); return origAppGet.apply(this, arguments); };
app.use = function (path) { console.log('APP USE', path); checkPath(path); return origAppUse.apply(this, arguments); };

const Router = require('express').Router;
['get', 'post', 'put', 'delete', 'use', 'all'].forEach(m => {
  const orig = Router.prototype[m];
  Router.prototype[m] = function (path) { console.log('ROUTER', m, path); checkPath(path); return orig.apply(this, arguments); };
});

// load the real index.js
require('Z:\\CERMIC ZONE PROJECT\\SITO WEB CON FRAMER\\marketplace-backend/index.js');
