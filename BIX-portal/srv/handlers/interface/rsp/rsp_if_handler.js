const cds = require('@sap/cds');
const { data } = require('@sap/cds/lib/dbs/cds-deploy');

module.exports = class RspInterfaceService extends cds.ApplicationService {

  init() {

    const call_if_org_mm_promis = require('./call_if_org_mm_promis');
    call_if_org_mm_promis(this);

    const call_if_prj_labor_promis = require('./call_if_prj_labor_promis');
    call_if_prj_labor_promis(this);

    return super.init()
  }
}
