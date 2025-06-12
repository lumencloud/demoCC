const cds = require('@sap/cds');
const { data } = require('@sap/cds/lib/dbs/cds-deploy');

module.exports = class CommonInterfaceService extends cds.ApplicationService {

  init() {

    const call_if_gl_account_erp = require('./call_if_gl_account_erp');
    call_if_gl_account_erp(this);

    const call_if_customer_erp = require('./call_if_customer_erp');
    call_if_customer_erp(this);

    const call_if_commitment_item_erp = require('./call_if_commitment_item_erp');
    call_if_commitment_item_erp(this);

    const call_if_project_os_erp = require('./call_if_project_os_erp');
    call_if_project_os_erp(this);

    const call_if_org_hr = require('./call_if_org_hr');
    call_if_org_hr(this);

    const call_if_org_map_hr = require('./call_if_org_map_hr');
    call_if_org_map_hr(this);

    const call_if_project_promis = require('./call_if_project_promis');
    call_if_project_promis(this);

    const call_if_project = require('./call_if_project');
    call_if_project(this);

    return super.init()
  }
}
