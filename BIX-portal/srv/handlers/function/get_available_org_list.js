/**
 * 로그인한 사용자에게 허용되는 조직을 배열로 받음
 */
module.exports = async function (req) {
    let available_org_list = [];

    const userInfo = req.user;
    if (userInfo.is("bix-portal-company-viewer") || userInfo.is("bix-portal-sys-admin") || userInfo.is("bix-portal-manage")) {
        available_org_list = await SELECT.from('common_org_full_level_view');
    } else if (userInfo.is("bix-portal-display")) {
        // [자신이 속한 조직에 대한 조회 권한]
        // IAS > XSUAA JWT 전달받은 사원번호 조회
        const emp_no = req.user.attr?.emp_no[0];
        // const emp_no = '09190';

        // 사원번호 없을 시 권한없음
        if (!emp_no) return req.reject(403, 'No Auth');

        // 유저가 할당된 조직정보 조회 - COMMON_ORG_MAP
        const user_org = await SELECT.from('common_org_map')
            .where({ 'emp_no': emp_no, 'ver': SELECT.one.columns('ver').from('common_version').where({ 'tag': 'C' }) });

        // 매핑정보 없을 시 권한없음
        if (!user_org.length) req.reject(403, 'No Auth');

        // 할당 조직과 하위 조직 목록 검색
        let user_org_id = user_org.map(org => org.ORG_ID);

        const where = {
            lv1_id: { in: user_org_id },
            or: {
                lv2_id: { in: user_org_id },
                or: {
                    lv3_id: { in: user_org_id },
                    or: {
                        div_id: { in: user_org_id },
                        or: { hdqt_id: { in: user_org_id } }
                    }
                }
            },
        }; 

        // 임시로 전체 조직
        available_org_list = await SELECT.from('common_org_full_level_view').where(where);
        // available_org_list = await SELECT.from('common_org_full_level_view');
    }

    // 필드 전부 소문자로 변경
    available_org_list = available_org_list.map(oData => {
        let object = {};
        for (let sKey in oData) {
            object[`${sKey.toLowerCase()}`] = oData[sKey];
        }

        return object;
    })

    // 팀 단위 제거 및 org_id 없는 데이터 제거
    available_org_list = available_org_list.filter(oData => !oData.team_id && !!oData.org_id);

    return available_org_list;
}