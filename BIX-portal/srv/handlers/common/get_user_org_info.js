/**
 * 로그인한 사용자의 대표 조직
 * @param {Boolean} isTree 트리 형태로 반환할지 여부
 * @returns 
 */
module.exports = (srv) => {
    srv.on('get_user_org_info', async (req) => {
        try{

            const userInfo = req.user;
            let oInfo = {
                org_name: '',
                emp_no: '',
                auth: '',
                name: ''
            };

            oInfo.name = (parseInt(userInfo.attr?.familyName).isNaN && userInfo.attr?.familyName ? '' : userInfo.attr?.familyName) + (parseInt(userInfo.attr?.givenName).isNaN && userInfo.attr?.givenName ? '' : userInfo.attr?.givenName);
            oInfo.name = oInfo.name.replace("undefined", "");
            oInfo.name = oInfo.name.replace(/\d+/g,'');

            oInfo.emp_no = userInfo.attr?.emp_no?.[0];

            if (oInfo.emp_no) {
                const orgMap = await SELECT.one.columns('org_id').from('common_org_map').where({ 'emp_no': oInfo.emp_no, 'primary_status': 'Y', 'ver': SELECT.one.columns('ver').from('common_version').where({ 'tag': 'C' }) })
                if (orgMap) {
                    const orgInfo = await SELECT.one.from('common_org').where({
                        'id': orgMap.ORG_ID,
                        'ver': SELECT.one.columns('ver').from('common_version').where({ 'tag': 'C' })
                    });
                    if (orgInfo) oInfo.org_name = orgInfo.NAME;
                }
            }

            // 사원명 임시대체 코드
            if(oInfo.emp_no === '06800') oInfo.name = '홍승태';
            if(oInfo.emp_no === '11180') oInfo.name = '김준형';
            if(oInfo.emp_no === '08803') oInfo.name = '김창진';
            if(oInfo.emp_no === '11574') oInfo.name = '박세은';
            if(oInfo.emp_no === '06723') oInfo.name = '박천효';
            if(oInfo.emp_no === '09293') oInfo.name = '신주용';
            if(oInfo.emp_no === '11461') oInfo.name = '이지원';
            if(oInfo.emp_no === '06149') oInfo.name = '이현진';

            // 1차	홍승태	"	06800"	팀장	경영기획팀	BIX_Manager	st.hong@skcc.com
            // 1차	김준형	"	11180"	Manager	경영기획팀	BIX_Manager	jh_kim_@skcc.com
            // 1차	김창진	"	08803"	Manager	경영기획팀	BIX_Manager	kim.cj@skcc.com
            // 1차	박세은	"	11574"	Manager	경영기획팀	BIX_Manager	seeunpark@skcc.com
            // 1차	박천효	06723	Manager	경영기획팀	BIX_Manager	chunhyo@skcc.com
            // 1차	신주용	"	09293"	Manager	경영기획팀	BIX_Manager	sksjy@skcc.com
            // 1차	이지원	11461	Manager	경영기획팀	BIX_Manager	jion@skcc.com
            // 1차	이현진	06149	Manager	경영기획팀	BIX_Manager	lhj80@skcc.com

            if (userInfo.is("bix-portal-system-admin")) {
                oInfo.auth = "SYS ADMIN";
            } else if (userInfo.is("bix-portal-manage")) {
                oInfo.auth = "관리자";
            } else if (userInfo.is("bix-portal-company-viewer")) {
                oInfo.auth = "전사 조회";
            } else if (userInfo.is("bix-portal-user")) {
                oInfo.auth = "일반 사용자";
            }

            return oInfo;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}