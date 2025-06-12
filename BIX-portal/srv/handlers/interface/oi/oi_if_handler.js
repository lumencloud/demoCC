const cds = require('@sap/cds');
const { data } = require('@sap/cds/lib/dbs/cds-deploy');

module.exports = class OiInterfaceService extends cds.ApplicationService {

  init() {

    const call_if_ito_promis = require('./call_if_ito_promis');
    call_if_ito_promis(this);

    return super.init()
  }
}
