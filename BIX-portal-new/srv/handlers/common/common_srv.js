const cds = require('@sap/cds')

module.exports = class ComService extends cds.ApplicationService {
  init() {

    const get_org_descendant = require('./get_org_descendant');
    get_org_descendant(this);

    const get_org_target = require('./get_org_target');
    get_org_target(this);

    const get_dashboard_chart = require('./get_dashboard_chart');
    get_dashboard_chart(this);

    const { org } = cds.entities('ComService');

    this.before('READ', org, async (req) => {
      console.log(req)
    })

    return super.init()
  }
}

// module.exports = cds.service.impl(async function () {
//   // view 핸들러 소스코드 분리
//   // const org_descendant_view = require('./org_descendant_view');
//   // org_descendant_view(this);

//   // const org_ancestor_view = require('./org_ancestor_view');
//   // org_ancestor_view(this);

//   const get_org_descendant = require('./get_org_descendant');
//   get_org_descendant(this);

//   const get_org_target = require('./get_org_target');
//   get_org_target(this);
// })
