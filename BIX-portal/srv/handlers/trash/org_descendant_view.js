module.exports = (srv) => {
  srv.on(["READ"], 'org_descendant_view', async (req) => {
    const db = await cds.connect.to('db');
    const org = db.entities('common').org;
    const aCommonOrg = await SELECT.from(org).columns("id", "parent", "ccorg_cd", "name", "order", "type", "str_dt", "end_dt", "use_yn");

    // 조직 ID 파라미터
    const { org_id } = req.params[0];

    // 최종 반환 데이터
    let aTreeData = []; // 중간에 사용하는 데이터

    /**
     * 조직 목록을 순회하며 최종 데이터(aFinalData)에 데이터를 추가하는 함수
     * @param {Object} oData 조직 객체
     * @param {Boolean} bFlag 최종 데이터 추가 여부
     */
    let fnAddChild = function (oData, bFlag) {
      let aChildData = aCommonOrg.filter(oCommonOrg => oCommonOrg.parent === oData.id);

      // 파라미터가 현재 ID와 같으면 bFlag가 true / Child에도 true를 넘김
      bFlag = (bFlag || oData.id === org_id);

      // hierarchy_level 설정
      let oParentData = aTreeData.find(oTreeData => oTreeData.id === oData.parent);
      oData.hierarchy_level = (oParentData) ? oParentData.hierarchy_level + 1 : 0;

      // children 설정
      oData.children = aChildData;
      if (aChildData.length > 0) {
        oData.drill_state = "expanded";

        // bFlag가 true인 데이터만 추가
        if (bFlag) aTreeData.push(oData);
        // aTreeData.push(oData);

        aChildData.forEach(oChildData => fnAddChild(oChildData, bFlag));
      } else {
        oData.drill_state = "leaf";

        // bFlag가 true인 데이터만 추가
        if (bFlag) aTreeData.push(oData);
        // aTreeData.push(oData);
      }
    };

    // 최상위 데이터
    let oFirstOrg = aCommonOrg.find(aCommonOrg => aCommonOrg.parent === null);

    // 조직 ID 파라미터가 없을 때는 true(전체)로 고정
    fnAddChild(oFirstOrg, (!org_id) ? true : false);
    // fnAddChild(oFirstOrg, true);


    // 조직 이름 Parameter가 있을 때 해당 조직 이름을 포함한 상위 데이터만 반환
    // 조직 이름을 변환 (소문자, 공백 제거, |를 /로 변환)
    // let sQuery = (org_name.length > 0) ? org_name.toLowerCase().replaceAll(" ", "").replaceAll("|", "/") : "";
    // if (sQuery) {
    //   let fnCheckChild = function (oData) {
    //     let sOrgName = oData.name.toLowerCase().replaceAll(" ", "");
    //     let isExist = false;

    //     // 조직 이름에 Query가 포함될 때
    //     if (oData.children.length > 0) {
    //       isExist = oData.children.filter(oChild => fnCheckChild(oChild)) || sOrgName.includes(sQuery);
    //       if (isExist) {

    //       } else {
    //         delete oData.children;
    //       }
    //     } else {
    //       isExist = sOrgName.includes(sQuery);
    //     }

    //     console.log(oData, isExist);
    //     return !!isExist;
    //   }

    //   let oFirstOrg = aTreeData.find(oTreeData => oTreeData.hierarchy_level === 0);
    //   fnCheckChild(oFirstOrg);
    // }

    // children 제거
    let aFinalData = aTreeData.map(oData => {
      delete oData.children;
      return oData;
    });

    return aFinalData;
  });

}