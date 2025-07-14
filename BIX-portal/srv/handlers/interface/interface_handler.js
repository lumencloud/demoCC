const cds = require('@sap/cds');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const { func } = require('@sap/cds/lib/ql/cds-ql');
const { exists } = require('@sap/cds/lib/utils/cds-utils');
const { promises } = require('fs');
const { scheduler } = require('timers/promises');

module.exports = class InterfaceService extends cds.ApplicationService {

  init() {

    // BIX_transfer_check
    const BIX_transfer_check = require('./BIX_transfer_check');
    BIX_transfer_check(this);

    // WBS Project PROMIS 정보 누락
    const execute_wbs_prj_batch = require('./execute_wbs_prj_batch');
    execute_wbs_prj_batch(this);

    // WBS Project Platform 프로젝트 고객사 정보 누락
    const execute_wbs_prj_platform_batch = require('./execute_wbs_prj_platform_batch');
    execute_wbs_prj_platform_batch(this);

    // 주간 Pipeline 배치 수행
    const execute_pipeline_batch = require('./execute_pipeline_batch');
    execute_pipeline_batch(this);

    // 단 건 배치수행 API
    const execute_batch_renew = require('./execute_batch_renew');
    execute_batch_renew(this);

    // 인터페이스 수행 API 실행 핸들러 로직
    const execute_batch = require('./execute_batch');
    execute_batch(this);

    return super.init()
  }
}
