const fs = require('fs');

fs.renameSync('./package_origin.json', './package.json');
fs.renameSync('./approuter/package_origin.json', './approuter/package.json');
fs.renameSync('./approuter/xs-app_origin.json', './approuter/xs-app.json');
fs.renameSync('./mta_origin.yaml', './mta.yaml');