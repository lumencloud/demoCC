/**
 * 로그인한 사용자의 권한 체크
 */
module.exports = async function (req, params) {
    const userInfo = req.user;
    const check_org_id = params?.orgId || req.data?.org_id;
    if (!check_org_id) req.reject(403, 'Auth Check Failed');

    // [자신이 속한 조직에 대한 조회 권한]
    // IAS > XSUAA JWT 전달받은 사원번호 조회
    const emp_no = req.user.attr?.emp_no[0];
    // 사원번호 없을 시 권한없음
    // if (!emp_no) return req.reject(403, 'No Auth');

    if (params?.report_type) {   // 주간/월간 보고서용 권한 검사
        // sys-admin 권한은 전체 조회 가능
        if (userInfo.is("bix-portal-sys-admin")) return;

        // 로그인한 사번의 사용자의 데이터가 common_report_role_map에 존재하는지 확인
        const user_report_role = await SELECT.one.from('common_report_role_map').where({ emp_no: emp_no, report_type: params.report_type });
        if (!user_report_role) return req.reject(403, 'No Auth');

        // check_org_id의 ccorg_cd가 존재할 때는 해당 부문만을 조회할 수 있음
        if (user_report_role.CCORG_CD) {
            let { ORG_CCORG_CD } = await SELECT.one.columns('org_ccorg_cd').from('COMMON_ORG_FULL_LEVEL_VIEW').where({ org_id: check_org_id });
            if (user_report_role.CCORG_CD !== ORG_CCORG_CD) return req.reject(403, 'No Auth');
        }
    } else {    // 기본 권한 검사
        if (userInfo.is("bix-portal-company-viewer") || userInfo.is("bix-portal-sys-admin") || userInfo.is("bix-portal-manage")) {
            // [전사 조회 권한] 은 통과

        } else if (userInfo.is("bix-portal-display")) {


            // 유저가 할당된 조직정보 조회 - COMMON_ORG_MAP
            const user_org = await SELECT.from('COMMON_ORG_MAP').columns(['ORG_ID'])
                .where({ 'emp_no': emp_no, 'ver': SELECT.one.columns('ver').from('common_version').where({ 'tag': 'C' }) });

            // 매핑정보 없을 시 권한없음
            if (!user_org.length) req.reject(403, 'No Auth');

            // ORG_ID를 배열로 생성
            const array_org_id = user_org.map(org => org.ORG_ID);

            // ORG_ID 배열에 속한 모든 조직 반환
            const available_org_list = await SELECT.from('COMMON_ORG_FULL_LEVEL_VIEW')
                .where({ LV1_ID: { 'in': array_org_id }, or: { LV2_ID: { 'in': array_org_id }, or: { LV3_ID: { 'in': array_org_id }, or: { DIV_ID: { 'in': array_org_id }, or: { HDQT_ID: { 'in': array_org_id } } } } } });

            // 사원정보 조직의 하위 조직 안에 검색 조직이 속하지 않을 경우 권한없음 처리
            if (!available_org_list?.find(item => item.ORG_ID === check_org_id)) return req.reject(403, 'No Auth');
        } else {
            // 권한 설정되지 않은 유저 권한없음 처리
            return req.reject(403, 'No Auth');
        }

    }
}