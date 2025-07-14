/**
 * 로그인한 사용자의 권한 체크
 */
module.exports = async function (req, orgName) {
    const userInfo = req.user;
    const check_org_name = orgName || req.data.org_name;

    if (!check_org_name) req.reject(403, 'Auth Check Failed');
    if (userInfo.is("bix-portal-company-viewer")) {
        // [전사 조회 권한] 은 통과

    } else if (userInfo.is("bix-portal-display")) {
        // [자신이 속한 조직에 대한 조회 권한]
        // IAS > XSUAA JWT 전달받은 사원번호 조회
        const emp_no = req.user.attr?.emp_no[0];

        // 사원번호 없을 시 권한없음
        if (!emp_no) return req.reject(403, 'No Auth');

        // 유저가 할당된 조직정보 조회 - COMMON_ORG_MAP
        const user_org = await SELECT.from('COMMON_ORG_MAP').columns(['ORG_ID'])
            .where({ 'emp_no': emp_no, 'ver': SELECT.one.columns('ver').from('common_version').where({ 'tag': 'C' }) });

        // 매핑정보 없을 시 권한없음
        if (!user_org.length) req.reject(403, 'No Auth');
            
        // ORG_ID를 배열로 생성
        const array_org_id = user_org.map(org => org.ORG_ID);

        // ORG_ID 배열을 통해 ORG_NAME들 반환
        const user_org_name = await SELECT.from('COMMON_ORG_FULL_LEVEL_VIEW').columns('ORG_NAME')
            .where({ ORG_ID: { 'in': array_org_id } });

        // ORG_NAME을 배열로 생성
        const array_org_name = user_org_name.map(org => org.ORG_NAME);

        // ORG_NAME 배열에 속한 모든 조직 반환
        const available_org_list = await SELECT.from('COMMON_ORG_FULL_LEVEL_VIEW')
            .where({ LV1_NAME: { 'in': array_org_name }, or: { LV2_NAME: { 'in': array_org_name }, or: { LV3_NAME: { 'in': array_org_name }, or: { DIV_NAME: { 'in': array_org_name }, or: { HDQT_NAME: { 'in': array_org_name } } } } } });

        // 사원정보 조직의 하위 조직 안에 검색 조직이 속하지 않을 경우 권한없음 처리
        if (!available_org_list?.find(item => item.ORG_NAME === check_org_name)) return req.reject(403, 'No Auth');
    } else {
        // 권한 설정되지 않은 유저 권한없음 처리
        return req.reject(403, 'No Auth');
    }
}