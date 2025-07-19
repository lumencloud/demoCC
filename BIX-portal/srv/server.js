const cds = require('@sap/cds');

cds.on('bootstrap', app => {
    app.get('/health', (req, res) => {
        res.status(200).send('OK');
    });
});

module.exports = cds.server;