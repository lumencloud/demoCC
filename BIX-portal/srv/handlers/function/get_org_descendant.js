/**
 * 선택한 조직을 포함한 하위 조직 반환
 * @param {String} sOrgId 선택한 조직을 포함한 하위 조직만 반환
 * @param {Boolean} isTree 최종 반환한 데이터를 트리 구조로 반환할 것인지
 * @returns {Array}
 */
module.exports = async function (sOrgId, isTree, isDelivery) {
    // 조직 전체 데이터 호출
    const db = await cds.connect.to('db');
    const org_full_level = db.entities('common').org_full_level_view;

    // where 조건 설정
    let org_where = `(team_id is null or (team_id is not null and hdqt_id is null))`;

    // DB 쿼리 실행 (병렬)
    const [aOrgFullLevel] = await Promise.all([
        SELECT.from(org_full_level).orderBy(`org_order`).where(org_where),
    ]);
    console.log(aOrgFullLevel);

    // 마지막 버전의 조직이 없는 경우 예외처리
    if (aOrgFullLevel.length === 0) return;

    let aTreeData = [];

    // 최상위 데이터 추가
    let oFirstOrg = aOrgFullLevel.find(oOrgFullLevel => oOrgFullLevel.org_parent === null);
    // aTreeData.push(oFirstOrg);

    let fnAddChild = function (oData, bFlag) {
        let aChildData = aOrgFullLevel.filter(oCommonOrg => oCommonOrg.org_parent === oData.org_id);

        // 파라미터가 현재 ID와 같으면 bFlag가 true / Child에도 true를 넘김
        bFlag = (bFlag || oData.id === sOrgId);

        // hierarchy_level 설정
        let oParentData = aTreeData.find(oTreeData => oTreeData.org_id === oData.org_parent);
        oData.hierarchy_level = (oParentData) ? oParentData.hierarchy_level + 1 : 0;

        // children 설정
        if (aChildData.length > 0) {
            oData.children = aChildData;
            oData.drill_state = "expanded";

            // bFlag가 true인 데이터만 추가
            if (bFlag) aTreeData.push(oData);

            aChildData.forEach(oChildData => fnAddChild(oChildData, bFlag));
        } else {
            oData.drill_state = "leaf";

            // bFlag가 true인 데이터만 추가
            if (bFlag) aTreeData.push(oData);
        }
    };

    // 조직 ID 파라미터가 없을 때는 true(전체)로 고정
    fnAddChild(oFirstOrg, (!sOrgId) ? true : false);

    // isTree = true일 때 트리구조로 반환
    if (isTree) {
        var aFinalData = aTreeData.find(oData => oData.org_parent === null);
    } else {
        var aFinalData = aTreeData.map(oData => {
            delete oData.children;
            return oData;
        });
    }

    return aFinalData;
}