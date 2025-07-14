const cds = require('@sap/cds')

module.exports = class ComService extends cds.ApplicationService {
  init() {
    
    const get_available_org_list = require('./get_available_org_list');
    get_available_org_list(this);

    const get_org_descendant = require('./get_org_descendant');
    get_org_descendant(this);

    const get_type_target = require('./get_type_target');
    get_type_target(this);

    const get_dashboard_chart = require('./get_dashboard_chart');
    get_dashboard_chart(this);

    const get_user_org_info = require('./get_user_org_info');
    get_user_org_info(this);

    // 메뉴 권한제어
    const { Menus } = cds.entities('ComService');
    /**
     * 메뉴 중 role 에 해당하는 메뉴만 사용자에게 강제 필터링
     */
    this.before('READ', Menus, async (req) => {
      
      const condition = [{ref:['role']}, 'in', {list: [{val:'user'}]}];
      if(req.user.is("bix-portal-system-admin")){
        condition[2].list.push({val:'admin'})
      };
      if(req.user.is("bix-portal-manage")){
        condition[2].list.push({val:'manage'})
      };
      if(!req.query.SELECT.where){
        req.query.SELECT.where = condition;
      }else{ 
        req.query.SELECT.where = [...req.query.SELECT.where, 'and', ...condition]
      }
      
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
