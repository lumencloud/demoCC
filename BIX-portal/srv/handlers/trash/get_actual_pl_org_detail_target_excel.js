const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_pl_org_detail_target_excel', async (req) => {
        try{
            //pl 디테일 테이블 엑셀 파일 다운로드 pl-target 부분.(pl, pl target, sga, rsp각각 handler 작성)
            /**
             * 핸들러 초기에 권한체크
             */
            await check_user_auth(req);

            /**
             * API 리턴값 담을 배열 선언
             */
            const oResult = [];

            // cds 모듈을 통한 DB 커넥트
            const db = await cds.connect.to('db');

            // 조회 대상 DB 테이블
            // entities('<cds namespace 명>').<cds entity 명>
            // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
            // (서비스에 등록할 필요는 없음)
            /**
             * pl.view.target_view
             * [부문/본부/팀 + 년,판매,판매,마진,BR 목표금액] ccorg_cd 기준으로 포탈에 입력한 목표
             */
            const pl_target_view = db.entities('pl').target_view;
            /**
             * common_org_full_level_view [조직정보]
             */
            const org_full_level = db.entities('common').org_full_level_view;

            // function 입력 파라미터
            const { year, month, org_id } = req.data;
            const last_year = (Number(year) - 1).toString();

            /** 
             * 타겟 뷰 조회용 컬럼
             */
            const target_where_conditions = { 'year': { in: [year, last_year] } };

            /**
             * org_id 파라미터값으로 조직정보 조회
             * 
             */
            // org 전체 데이터
            let org_query = await SELECT.from(org_full_level);

            // 조직 정보를 where 조건에 추가
            let lv_chk = org_query.find(data => data.lv1_id === org_id || data.lv2_id === org_id)
            let org_data;
            let org_chk;
            if(lv_chk){
                let aKey = new Set;
                org_data = org_query.filter(data =>{
                    if(!aKey.has(data.div_id)){
                        aKey.add(data.div_id);
                        return true;
                    };
                    return false;
                });
                org_chk = 'div_id';
            }else{
                let div_chk = org_query.find(data => data.div_id === org_id);
                let hdqt_chk = org_query.find(data => data.hdqt_id === org_id);

                if(div_chk){
                    org_chk = "hdqt_id";
                    let aKey = new Set;
                    org_data = org_query.filter(data =>{
                    if(!aKey.has(data.hdqt_id) && data.div_id === org_id && data.hdqt_id){
                        aKey.add(data.hdqt_id);
                        return true;
                    };
                    return false;
                    });
                }else if(hdqt_chk){
                    org_chk = "team_id";
                    let aKey = new Set;
                    org_data = org_query.filter(data =>{
                    if(!aKey.has(data.team_id) && data.hdqt_id === org_id && data.team_id){
                        aKey.add(data.team_id);
                        return true;
                    };
                    return false;
                    });
                };
            };

            let target_where;

            if (org_data?.length > 0) {
                let aOrgCode = [];
                org_data.forEach(data =>{
                    if(data[`${org_chk}`]){
                        aOrgCode.push(data[`${org_chk}`]);
                    };
                });

                target_where = { ...target_where_conditions, [`${org_chk}`]: [...aOrgCode] };
            }else{
                return;
            };

            const [query_target] = await Promise.all([
                SELECT.from(pl_target_view).where(target_where),
            ]);

            oResult.push(...query_target);
            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}