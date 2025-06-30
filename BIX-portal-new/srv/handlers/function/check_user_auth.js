/**
 * 로그인한 사용자의 권한 체크
 */
module.exports = async function (req, orgId) {
    const userInfo = req.user;
    const check_org_id = orgId || req.data.org_id;
    if(! check_org_id) req.reject(403, 'Auth Check Failed');
    if (userInfo.is("bix-portal-company-viewer")) {
        // [전사 조회 권한] 은 통과
    } else if (userInfo.is("bix-portal-display")) {
        // [자신이 속한 조직에 대한 조회 권한]
        // IAS > XSUAA JWT 전달받은 사원번호 조회
        const emp_no = req.user.attr?.emp_no[0];
        // 사원번호 없을 시 권한없음
        if (!emp_no) return req.reject(403, 'No Auth');
        // 유저가 할당된 조직정보 조회 - COMMON_ORG_MAP
        const user_org = await SELECT.from('COMMON_ORG_MAP').columns(['ORG_ID']).where({ 'EMP_NO': emp_no });
        // 매핑정보 없을 시 권한없음
        if (!user_org.length) req.reject(403, 'No Auth');
        // 할당 조직과 하위 조직 목록 검색
        const available_org_list = await Promise.all(
            user_org.map(async ({ key, ORG_ID }) => {
                return SELECT.from('COMMON_ORG_FULL_LEVEL_VIEW')
                    .where`${ORG_ID} in (LV1_ID, LV2_ID, LV3_ID, DIV_ID, HDQT_ID)`;
            })
        )
        // 사원정보 조직의 하위 조직 안에 검색 조직이 속하지 않을 경우 권한없음 처리
        if (!available_org_list?.flat()?.find(item => item.ORG_ID === check_org_id)) return req.reject(403, 'No Auth');
    } else {
        // 권한 설정되지 않은 유저 권한없음 처리
        return req.reject(403, 'No Auth');
    }
}