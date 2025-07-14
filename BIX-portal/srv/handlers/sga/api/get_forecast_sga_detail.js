const { isRedirect } = require("@sap/cds/libx/odata/utils");

const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_sga_detail', async (req) => {
        try{
            /**
             * 핸들러 초기에 권한체크
             */
            await check_user_auth(req);

            // function 호출 리턴 객체
            const aRes = [];

            // cds 모듈을 통한 DB 커넥트
            const db = await cds.connect.to('db');

            /**
             * sga.wideview_view [실적]
             * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const sga_view = db.entities('sga').wideview_view;
            /**
             * rsp_wideview_unpivot_view [총비용]
             */
            const rsp_view = db.entities('rsp').wideview_unpivot_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;
            
            // function 입력 파라미터 - type 값 month(월기준), deal(deal stage 기준), rodr(수주 금액 기준) 
            const { year, month, org_id } = req.data;
            let i_month = Number(month);

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
                let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd'])
                    .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`;

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            let org_col_nm = orgInfo.org_level;

            //sga 및 rsp db 검색 조건.
            let a_exp_secured = []
            let a_exp_not_secured = []
            let a_labor_secured = []
            let a_iv_secured = []
            let a_iv_not_secured = []

            for(let i=1; i<=12; i++){
                if(i<=i_month){
                    a_exp_secured.push(`ifnull(sum(exp_m${i}_amt), 0)`);
                    a_labor_secured.push(`ifnull(sum(labor_m${i}_amt), 0)`);
                    a_iv_secured.push(`ifnull(sum(iv_m${i}_amt), 0)`);
                }else{
                    a_exp_not_secured.push(`ifnull(sum(exp_m${i}_amt), 0)`);
                    a_iv_not_secured.push(`ifnull(sum(iv_m${i}_amt), 0)`);
                }
            }
            let s_exp_secured = "("+a_exp_secured.join(' + ')+') as exp_secured_value';
            let s_labor_secured = "("+a_labor_secured.join(' + ')+') as labor_secured_value';
            let s_iv_secured = "("+a_iv_secured.join(' + ')+') as iv_secured_value';
            let s_exp_not_secured = "("+a_exp_not_secured.join(' + ')+') as exp_not_secured_value';
            let s_iv_not_secured = "("+a_iv_not_secured.join(' + ')+') as iv_not_secured_value';
            const sga_col_list = ['year','org_order', s_exp_secured, s_labor_secured, s_iv_secured, s_exp_not_secured, s_iv_not_secured];
            
            const sga_where_conditions = {'year': year};
            const sga_groupBy_cols = ['year','org_order'];

            const rsp_col_list = ['year', 'month_amt', 'ifnull(sum(opp_amt), 0) as opp_amt', 'ifnull(sum(opp_year_amt), 0) as opp_year_amt'];
            const rsp_where_conditions = {'year' : year, 'is_delivery': true};
            const rsp_groupBy_cols = ['year','month_amt'];
            
            let sga_column = org_col_nm === 'div_id' ? [...sga_col_list,'hdqt_id as id','hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...sga_col_list,'team_id as id','team_name as name'] : [...sga_col_list,'div_id as id','div_name as name'];
            let sga_where = org_col_nm === 'div_id' ? {...sga_where_conditions,'hdqt_id':{'!=':null},and:{[org_col_nm]: org_id}} : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? {...sga_where_conditions,'team_id':{'!=':null},and:{[org_col_nm]: org_id}} : {...sga_where_conditions,'div_id':{'!=':null},and:{[org_col_nm]: org_id}};
            let sga_groupBy = org_col_nm === 'div_id' ? [...sga_groupBy_cols,'hdqt_id','hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...sga_groupBy_cols,'team_id','team_name'] : [...sga_groupBy_cols,'div_id','div_name'];

            let rsp_column = org_col_nm === 'div_id' ? [...rsp_col_list,'hdqt_id as id','hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...rsp_col_list,'team_id as id','team_name as name'] : [...rsp_col_list,'div_id as id','div_name as name'];
            let rsp_where = org_col_nm === 'div_id' ? {...rsp_where_conditions,'hdqt_id':{'!=':null},and:{[org_col_nm]: org_id}} : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? {...rsp_where_conditions,'team_id':{'!=':null},and:{[org_col_nm]: org_id}} : {...rsp_where_conditions,'div_id':{'!=':null},and:{[org_col_nm]: org_id}};
            let rsp_groupBy = org_col_nm === 'div_id' ? [...rsp_groupBy_cols,'hdqt_id','hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...rsp_groupBy_cols,'team_id','team_name'] : [...rsp_groupBy_cols,'div_id','div_name'];


            const [sga_query, rsp_query] = await Promise.all([
                SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy).orderBy(['org_order']),
                SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
            ]);

            let o_total = {
                exp:{display_order:1, div_name:'합계', type:'경비'}, 
                labor:{display_order:2, div_name:'합계', type:'인건비'}, 
                iv:{display_order:3, div_name:'합계', type:'투자비'}
            } 
            let o_result = {}
            let index =2;
            sga_query.forEach(o_sga => {
                if(!o_result[`${o_sga.id}_exp`]){
                    o_result[`${o_sga.id}_exp`] = {display_order:(index)*3-2, div_name:o_sga.name, type:'경비'}
                    o_result[`${o_sga.id}_labor`] = {display_order:(index)*3-1, div_name:o_sga.name, type:'인건비'}
                    o_result[`${o_sga.id}_iv`] = {display_order:(index)*3, div_name:o_sga.name, type:'투자비'}
                    index++
                }
                o_result[`${o_sga.id}_exp`]['forecast_value'] = (o_result[`${o_sga.id}_exp`]['forecast_value'] || 0) + o_sga[`exp_secured_value`] + o_sga[`exp_not_secured_value`]
                o_result[`${o_sga.id}_iv`]['forecast_value'] = (o_result[`${o_sga.id}_iv`]['forecast_value'] || 0) + o_sga[`iv_secured_value`] + o_sga[`iv_not_secured_value`]
                o_result[`${o_sga.id}_labor`]['forecast_value'] = (o_result[`${o_sga.id}_labor`]['forecast_value'] || 0) + o_sga[`labor_secured_value`]
                o_result[`${o_sga.id}_exp`]['secured_value'] = (o_result[`${o_sga.id}_exp`]['secured_value'] || 0) + o_sga[`exp_secured_value`]
                o_result[`${o_sga.id}_iv`]['secured_value'] = (o_result[`${o_sga.id}_iv`]['secured_value'] || 0) + o_sga[`iv_secured_value`]
                o_result[`${o_sga.id}_labor`]['secured_value'] = (o_result[`${o_sga.id}_labor`]['secured_value'] || 0) + o_sga[`labor_secured_value`]
                o_result[`${o_sga.id}_exp`]['not_secured_value'] = (o_result[`${o_sga.id}_exp`]['not_secured_value'] || 0) + o_sga[`exp_not_secured_value`]
                o_result[`${o_sga.id}_iv`]['not_secured_value'] = (o_result[`${o_sga.id}_iv`]['not_secured_value'] || 0) + o_sga[`iv_not_secured_value`]

                o_total[`exp`]['forecast_value'] = (o_total[`exp`]['forecast_value'] || 0) + o_sga[`exp_secured_value`] + o_sga[`exp_not_secured_value`]
                o_total[`iv`]['forecast_value'] = (o_total[`iv`]['forecast_value'] || 0) + o_sga[`iv_secured_value`] + o_sga[`iv_not_secured_value`]
                o_total[`labor`]['forecast_value'] = (o_total[`labor`]['forecast_value'] || 0) + o_sga[`labor_secured_value`]

                o_total[`exp`]['secured_value'] = (o_total[`exp`]['secured_value'] || 0) + o_sga[`exp_secured_value`]
                o_total[`iv`]['secured_value'] = (o_total[`iv`]['secured_value'] || 0) + o_sga[`iv_secured_value`]
                o_total[`labor`]['secured_value'] = (o_total[`labor`]['secured_value'] || 0) + o_sga[`labor_secured_value`]

                o_total[`exp`]['not_secured_value'] = (o_total[`exp`]['not_secured_value'] || 0) + o_sga[`exp_not_secured_value`]
                o_total[`iv`]['not_secured_value'] = (o_total[`iv`]['not_secured_value'] || 0) + o_sga[`iv_not_secured_value`]

                for(let i=i_month; i<=12; i++){
                    let s_month = i.toString().padStart(2,'0');
                    let o_rsp = rsp_query.find(o_rsp => o_rsp.id === o_sga.id && o_rsp.month_amt === s_month)

                    o_total[`labor`]['forecast_value'] = (o_total[`labor`]['forecast_value'] || 0) + (o_rsp?.[`opp_amt`] ?? 0)
                    o_total[`labor`]['not_secured_value'] = (o_total[`labor`]['not_secured_value'] || 0) + (o_rsp?.[`opp_amt`] ?? 0)
                    o_result[`${o_sga.id}_labor`]['forecast_value'] = (o_result[`${o_sga.id}_labor`]['forecast_value'] || 0) + (o_rsp?.[`opp_amt`] ?? 0)
                    o_result[`${o_sga.id}_labor`]['not_secured_value'] = (o_result[`${o_sga.id}_labor`]['not_secured_value'] || 0) + (o_rsp?.[`opp_amt`] ?? 0)
                }
            })

            const a_result = Object.values(o_result);
            const a_total = Object.values(o_total);

            aRes.push(...a_total,...a_result)
            return aRes
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}