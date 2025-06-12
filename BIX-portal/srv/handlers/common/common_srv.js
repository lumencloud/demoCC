const cds = require('@sap/cds')

module.exports = class ComService extends cds.ApplicationService {
  init() {


    // this.after(["READ", "CREATE", "UPDATE", "DELETE"], "org", async (_, req) => {
    //   const tx = cds.transaction(req);
    //   await Test(tx);
    // })

    return super.init()
  }
}

module.exports = cds.service.impl(async function () {
  // view 핸들러 소스코드 분리
  // const org_descendant_view = require('./org_descendant_view');
  // org_descendant_view(this);

  // const org_ancestor_view = require('./org_ancestor_view');
  // org_ancestor_view(this);

  const get_org_descendant = require('./get_org_descendant');
  get_org_descendant(this);

  const get_org_target = require('./get_org_target');
  get_org_target(this);
})
