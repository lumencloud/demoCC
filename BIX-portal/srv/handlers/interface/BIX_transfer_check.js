const { func } = require('@sap/cds/lib/ql/cds-ql');

module.exports = (srv) => {
    srv.on('BIX_transfer_check', async (req) => {
        const { I_CODE } = req.data;

        let oReturn = {
            "O_RTCD": 'S',
            "O_MESSAGE": `Your Input is [ ${I_CODE} ] - Connection Test OK`
        }

        return oReturn;
    })
}
