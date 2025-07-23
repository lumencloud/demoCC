const approuter = require('@sap/approuter');
const axios = require('axios');
const http = require('http');
const xsenv = require('@sap/xsenv');
const fs = require("fs");
const ar = approuter();
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

// // SAP BTP XSUAA 서비스 로드
// const services = xsenv.getServices({ xsuaa: { tag: "xsuaa" } });
// const xsuaaCredentials = services.xsuaa;

xsenv.loadEnv();

ar.beforeRequestHandler.use((req, res, next) => {
  // req.correlationId = req.headers['x-correlation-id'] || uuid();
  req._start = process.hrtime.bigint();
  next();
});

morgan.token('id', req => req.user && req.user?.name);
morgan.token('user', req => {
  return (jwt.decode(req.user?.token.accessToken)?.family_name || '') + jwt.decode(req.user?.token.accessToken)?.given_name;
});
morgan.token('duration_ms', req => {
  if (!req._start) return 0;
  const diff = Number(process.hrtime.bigint() - req._start);
  return Math.round(diff / 1e6);
})
morgan.token("correlation_id", req => req.correlationId);

const jsonFormat = (tokens, req, res) => JSON.stringify({
  timestamp: new Date().toISOString(),
  method: tokens.method(req, res),
  url: tokens.url(req, res),
  status: Number(tokens.status(req, res)),
  id: tokens.id(req, res),
  user: tokens.user(req, res),
  duration_ms: tokens.duration_ms(req, res),

});

ar.beforeRequestHandler.use(morgan(jsonFormat, { stream: process.stdout }));

ar.beforeRequestHandler.use("/sessionCheck", function (req, res) {
  let a = jwt.decode(req.user.token)
  let sessionTimeout = '';
  req.sessionStore.getSessionTimeout(req.sessionID, (err, time) => { sessionTimeout = time })
  res.end(JSON.stringify({ 'sessionTimeout': sessionTimeout }));
});

ar.beforeRequestHandler.use("/self", function (req, res) {
  res.end(JSON.stringify({ id: req.user.id, name: req.user.name }));
});

ar.start({}, async () => {
  
});



function gen_i18n_files(aI18nData, langCode) {
  let i18n = {};
  for (const reqBody of aI18nData) {
    i18n[reqBody.i18nkey] = reqBody.i18nProperty;
  }
  let properties = jsonToProperties(i18n);
  fs.writeFileSync('resources/i18n/i18n_' + langCode + '.properties', properties, 'utf8');

}

function jsonToProperties(json, prefix = '') {
  let properties = '';

  for (const key in json) {
    if (json.hasOwnProperty(key)) {
      const value = json[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        properties += jsonToProperties(value, fullKey);
      } else {
        properties += `${fullKey}=${value}\n`;
      }
    }
  }

  return properties;
}