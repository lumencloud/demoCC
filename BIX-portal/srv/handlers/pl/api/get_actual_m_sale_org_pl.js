const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_actual_m_sale_org_pl', async (req) => {
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
            const pl_view = db.entities('pl').wideview_org_view;
            //org_tp:account, hybrid일 경우 사용
            const account_pl_view = db.entities('pl').wideview_account_org_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id, org_tp } = req.data;
            
            /**
             * org_id 파라미터값으로 조직정보 조회
             */
            const org_col = `case
                when lv1_id = '${org_id}' THEN 'lv1_id'
                when lv2_id = '${org_id}' THEN 'lv2_id'
                when lv3_id = '${org_id}' THEN 'lv3_id'
                when div_id = '${org_id}' THEN 'div_id'
                when hdqt_id = '${org_id}' THEN 'hdqt_id'
                when team_id = '${org_id}' THEN 'team_id'
                end as org_level`;
            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', "lv1_name","lv2_name","lv3_name","div_name","hdqt_name","team_name",'org_tp']).where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level;
            let org_col_nm_name = orgInfo[org_col_nm.split('_',1) + '_name'];
            let org_ccorg = orgInfo.org_ccorg_cd;
            let org_ccorg_col = org_col_nm.split('_',1) + '_ccorg_cd';
            let search_org, search_org_name, search_org_ccorg;

            let a_sale_column = [];
            let a_margin_column = [];
            for (let i = 1; i <= Number(month); i++) {
                a_sale_column.push(`ifnull(sum(sale_m${i}_amt), 0)`)
                a_margin_column.push(`ifnull(sum(margin_m${i}_amt), 0)`)
            };
            let s_sale_column = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
            let s_margin_column = "(" + a_margin_column.join(' + ') + ') as margin_amount_sum';

            const pl_col_list = ['year', s_sale_column, s_margin_column];
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

            let org_column = org_col_nm === 'lv1_id' ? [search_org, search_org_name, search_org_ccorg, 'org_order', 'org_tp', 'org_id'] : [search_org, search_org_name, search_org_ccorg, 'org_order', 'org_id'];
            let org_where = { [org_col_nm]: org_id, 'org_tp' : {'!=':null} }; // account 조직 제거
            const org_query = await SELECT.from(org_full_level).columns(org_column).where(org_where).orderBy('org_order');

            //조직 리스트
            let org_list = [];
            let account_list=[];
            if(org_col_nm === 'lv1_id'){
                org_query.forEach(data=>{
                    if(data.org_tp === 'account'){
                        account_list.push(data.org_id);
                    };
                });
            };
            
            org_query.forEach(data=>{
                if(!org_list.find(data2=>data2.id === data[search_org]) && data[search_org]){
                    let oTemp = {
                        id : data[search_org],
                        name : data[search_org_name],
                        ccorg : data[search_org_ccorg],
                        org_order : data['org_order']
                    };

                    if(org_col_nm === 'lv1_id'){
                        if(!account_list.includes(oTemp.id)){
                            org_list.push(oTemp);
                        }
                    }else{
                        org_list.push(oTemp);
                    };
                };
            });

            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            let aAddList = [search_org, search_org_name];
            pl_col_list.push(...aAddList);
            let pl_col = org_col_nm === 'lv1_id' ? [...pl_col_list, 'org_tp'] : pl_col_list;
            const pl_where_conditions = { 'year': { in: [year] }, 'org_tp': {'!=' : 'account'} };   // account 조직 제거
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            // pl_where = org_tp ? { ...pl_where, 'org_tp' : org_tp } : pl_where;
            const pl_groupBy_cols = ['year', search_org, search_org_name];
            let pl_groupBy = org_col_nm === 'lv1_id' ? [...pl_groupBy_cols, 'org_tp'] : pl_groupBy_cols;

            let pl_view_select;
            if((org_col_nm !== 'lv1_id' || org_col_nm !== 'lv2_id') && orgInfo.org_tp === 'hybrid' || orgInfo.org_tp === 'account' || org_tp === 'account'){
                pl_view_select = account_pl_view;
            }else if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id'|| orgInfo.org_tp === 'delivery'){
                pl_view_select = pl_view;
            };
            // DB 쿼리 실행 (병렬)
            const [pl_data, target_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_col).where(pl_where).groupBy(...pl_groupBy),
                get_org_target(year, ['A01', 'A03', 'A02'])
            ]);
            // if(!pl_data.length){
            //     //return req.res.status(204).send();
            //     return []
            // }

            let pl_sedata;
            let odata={};
            if(org_col_nm === 'lv1_id'){
                pl_data.forEach(data=>{
                    if(data.org_tp !== "account"){
                        if(!odata[data[search_org]]){
                            odata[data[search_org]] = {div_id:data.div_id, div_name:data.div_name, year:year, sale_amount_sum:0, margin_amount_sum:0};
                        };
                        odata[data[search_org]]["sale_amount_sum"] += (data?.["sale_amount_sum"] ?? 0);
                        odata[data[search_org]]["margin_amount_sum"] += (data?.["margin_amount_sum"] ?? 0);
                    }
                });
                pl_sedata = Object.values(odata);
            }else{
                pl_sedata = pl_data;
            };

            // pl_data 결과 값 flat 하게 데이터 구성
            let flat_pl = pl_sedata.reduce((acc, item) =>{
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

            let flat_target = target_data.reduce((acc, item) =>{
                let main = item['org_id'];
                let rest = {...item};
                delete rest['org_id'];
                Object.entries(rest).forEach(([key, value])=>{
                    acc[`_${main}_${key}`] = value;
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
                    "sale_target" : (flat_target?.[`_${data.id}_target_sale`] ?? 0)*100000000,
                    "margin" : flat_pl?.[`_${data.id}_${year}_margin_amount_sum`] ?? 0,
                    "margin_target" : (flat_target?.[`_${data.id}_target_margin`] ?? 0)*100000000,
                    "margin_rate" : (flat_pl?.[`_${data.id}_${year}_sale_amount_sum`] ?? 0) === 0 ? 0 : ((flat_pl?.[`_${data.id}_${year}_margin_amount_sum`] ?? 0) / (flat_pl?.[`_${data.id}_${year}_sale_amount_sum`] ?? 0))*100,
                    "margin_rate_target" : (flat_target?.[`_${data.id}_target_margin_rate`] ?? 0),
                }

                org_data.push(temp_data);
            });
            oResult.push(...org_data);

            if(org_col_nm === 'div_id'){
                let total = {
                    "display_order": 0,
                    "org_id": org_id,
                    "org_name": org_col_nm_name,
                    "sale" : 0,
                    "sale_target" : (flat_target?.[`_${org_id}_target_sale`] ?? 0)*100000000,
                    "margin" : 0,
                    "margin_target" : (flat_target?.[`_${org_id}_target_margin`] ?? 0)*100000000,
                    "margin_rate" : 0,
                    "margin_rate_target" : (flat_target?.[`_${org_id}_target_margin_rate`] ?? 0)
                };
                pl_sedata.forEach(data=>{
                    total.sale += data.sale_amount_sum;
                    total.margin += data.margin_amount_sum;
                })
                total.margin_rate = total.sale === 0 ? 0 : (total.margin / total.sale) *100;
                oResult.unshift(total);
            };

            return oResult
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}