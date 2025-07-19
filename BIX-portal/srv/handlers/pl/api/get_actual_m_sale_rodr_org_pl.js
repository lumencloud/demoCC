const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_m_sale_rodr_org_pl', async (req) => {
        try{
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

            // =========================== 조회 대상 DB 테이블 ===========================
            // entities('<cds namespace 명>').<cds entity 명>
            // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
            // (서비스에 등록할 필요는 없음)
            
            /**
             * [실적]
             * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            //org_tp:account, hybrid일 경우 사용
            const pl_view = db.entities('pl').wideview_account_org_view;
            const pipeline_view = db.entities('pl').pipeline_view;

            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id } = req.data;
            const last_year = (Number(year) - 1).toString();
            
            /**
             * org_id 파라미터값으로 조직정보 조회
             */
            let orgInfo = await SELECT.one.from(org_full_level).columns(['org_level', 'org_ccorg_cd', "lv1_name","lv2_name","lv3_name","div_name","hdqt_name","team_name"]).where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level+'_id';
            let org_col_nm_name = orgInfo[org_col_nm.split('_',1) + '_name'];
            let search_org, search_org_name, search_org_ccorg;

            let a_sale_column = [];
            let a_rodr_columns = [];
            for (let i = 1; i <= Number(month); i++) {
                a_sale_column.push(`ifnull(sum(sale_m${i}_amt), 0)`)
                a_rodr_columns.push(`ifnull(sum(rodr_m${i}_amt), 0)`)
            };
            let s_sale_column = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
            let s_rodr_column = "(" + a_rodr_columns.join(' + ') + ') as rodr_amount_sum';

            const pl_col_list = ['year', `ifnull(sum(sale_m${Number(month)}_amt), 0) as sale_amount_sum`];
            // const pl_col_list = ['year', s_sale_column];
            const pipeline_column = ['year', `ifnull(sum(rodr_m${Number(month)}_amt), 0) as rodr_amount_sum`];
            // const pipeline_column = ['year', s_rodr_column];
            if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id'){
                search_org = 'div_id';
                search_org_name = 'div_name';
                search_org_ccorg = 'div_ccorg_cd';
            }else if(org_col_nm === 'div_id'){
                search_org = 'hdqt_id';
                search_org_name = 'hdqt_name';
                search_org_ccorg = 'hdqt_ccorg_cd';
            }else if(org_col_nm === 'hdqt_id' || org_col_nm === 'team_id'){
                search_org = 'team_id';
                search_org_name = 'team_name';
                search_org_ccorg = 'team_ccorg_cd';
            }else{return;};

            const org_query = await SELECT.from(org_full_level).columns([search_org, search_org_name, search_org_ccorg, 'org_order']).where({ [org_col_nm]: org_id, 'org_tp' : 'account' }).orderBy('org_order');

            //조직 리스트
            let org_list = [];
            org_query.forEach(data=>{
                if(!org_list.find(data2=>data2.id === data[search_org]) && data[search_org] && !data[search_org_name].includes('법인')){
                    let oTemp = {
                        id : data[search_org],
                        name : data[search_org_name],
                        ccorg : data[search_org_ccorg],
                        org_order : data['org_order']
                    };
                    org_list.push(oTemp);
                };
            });
    
            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            let aAddList = [search_org, search_org_name];
            pl_col_list.push(...aAddList);
            pipeline_column.push(...aAddList);
            const pl_where_conditions = { 'year': { in: [year, last_year] }};
            let pl_where =  org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            const pl_groupBy_cols = ['year', search_org, search_org_name];

            const pipeline_where_conditions = { 'year': year, 'weekly_yn': false, 'org_tp' : 'account'};
            let pipeline_where =  org_col_nm === 'lv1_id' ? pipeline_where_conditions : { ...pipeline_where_conditions, [org_col_nm]: org_id };
            const pipeline_groupBy_cols = ['year', search_org, search_org_name];
            
            // DB 쿼리 실행 (병렬)
            const [pl_data, pipeline_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols),
                SELECT.from(pipeline_view).columns(pipeline_column).where(pipeline_where).groupBy(...pipeline_groupBy_cols)
            ]);
            // if(!pl_data.length && !pipeline_data.length){
            //     //return req.res.status(204).send();
            //     return []
            // }

            // pl_data 결과 값 flat 하게 데이터 구성
            let flat_pl = pl_data.reduce((acc, item) =>{
                let main = item[search_org];
                let sub = item['year'];
                let rest = {...item};
                delete rest[search_org];
                delete rest['year'];
                Object.entries(rest).forEach(([key, value])=>{
                    acc[`_${main}_${sub}_${key}`] = value;
                });
                return acc;
            }, {});

            // pl_data 결과 값 flat 하게 데이터 구성
            let flat_rodr = pipeline_data.reduce((acc, item) =>{
                let main = item[search_org];
                let sub = item['year'];
                let rest = {...item};
                delete rest[search_org];
                delete rest['year'];
                Object.entries(rest).forEach(([key, value])=>{
                    acc[`_${main}_${sub}_${key}`] = value;
                });
                return acc;
            }, {});

            let i_count = 1
            let org_data = [];
            org_list.forEach(data=>{
                let temp_data = {
                    "display_order": ++i_count,
                    "org_id": data.id,
                    "org_name": data.name,
                    "sale" : flat_pl?.[`_${data.id}_${year}_sale_amount_sum`] ?? 0,
                    "rodr" : flat_rodr?.[`_${data.id}_${year}_rodr_amount_sum`] ?? 0,
                }

                org_data.push(temp_data);
            });

            if(org_col_nm === 'div_id'){
                let total = {
                    "display_order": 0,
                    "org_id": org_id,
                    "org_name": org_col_nm_name,
                    "sale" : 0,
                    "rodr" : 0
                };
                pl_data.forEach(data=>{
                    total.sale += data.sale_amount_sum;
                    total.rodr += data.rodr_amount_sum;
                })
                oResult.unshift(total);
            };
            oResult.push(...org_data)

            return oResult
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}