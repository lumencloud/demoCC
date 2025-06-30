module.exports = (srv) => {
  srv.on(["READ"], 'org_ancestor_view', async (req) => {
    const db = await cds.connect.to('db');
    const org = db.entities('common');

    const aCommonOrg = await SELECT.from(org).columns("id", "parent", "ccorg_cd", "name", "order", "type", "str_dt", "end_dt", "use_yn");

    // 조직 이름 파라미터
    let { org_nm } = req.params[0];

    // 조직 이름을 변환 (소문자, 공백 제거, |를 /로 변환)
    let sQuery = org_nm.toLowerCase().replaceAll(" ","").replaceAll("|","/")

    let aTreeData = [];

    // 최상위 데이터 추가
    let oFirstOrg = aCommonOrg.find(aCommonOrg => aCommonOrg.parent === null);
    // aTreeData.push(oFirstOrg);

    let fnAddParent = function (oData, bFlag) {
      let aChildData = aCommonOrg.filter(oCommonOrg => oCommonOrg.parent === oData.id);

      // 파라미터가 현재 ID와 같으면 bFlag가 true / Child에도 true를 넘김
      bFlag = (bFlag || oData.id === org_id);

      // hierarchy_level 설정
      let oParentData = aTreeData.find(oTreeData => oTreeData.id === oData.parent);
      oData.hierarchy_level = (oParentData) ? oParentData.hierarchy_level + 1 : 0;

      // children 설정
      if (aChildData.length > 0) {
        oData.children = aChildData;
        oData.drill_state = "expanded";

        // bFlag가 true인 데이터만 추가
        if (bFlag) aTreeData.push(oData);

        aChildData.forEach(oChildData => fnAddParent(oChildData, bFlag));
      } else {
        oData.drill_state = "leaf";

        // bFlag가 true인 데이터만 추가
        if (bFlag) aTreeData.push(oData);
      }
    };

    // 조직 ID 파라미터가 없을 때는 true(전체)로 고정
    fnAddParent(oFirstOrg, (!org_id) ? true : false);

    // children 제거
    let aFinalData = aTreeData.map(oData => {
      delete oData.children;
      return oData;
    });


    return aFinalData;
  });
}