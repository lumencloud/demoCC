const cds = require('@sap/cds')

module.exports = class ReportingService extends cds.ApplicationService {
    init() {

        this.before(['READ'],  async (req) => {
            console.log('Before CREATE/UPDATE reporting_pl_view', req.data)
        })

        return super.init()
    }
}