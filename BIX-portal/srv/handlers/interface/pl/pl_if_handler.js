const cds = require('@sap/cds');
const { data } = require('@sap/cds/lib/dbs/cds-deploy');

module.exports = class PLInterfaceService extends cds.ApplicationService {
  
  init() {
    
    const call_if_sfdc = require('./call_if_sfdc');
    call_if_sfdc(this);

    const call_sfdc_api = require('./call_sfdc_api');
    call_sfdc_api(this);

  return super.init()
}}