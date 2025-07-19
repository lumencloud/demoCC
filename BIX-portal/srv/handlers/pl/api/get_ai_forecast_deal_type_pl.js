const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_ai_forecast_deal_type_pl', async (req) => {
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
             * pl.wideview_org_view [실적]
             * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_view = db.entities('pl').pipeline_view;
            const sfdc_contract_view = db.entities('pl').sfdc_contract_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;

            // function 입력 파라미터
            //deal_stage_cd : lost = (Deal Lost, Deselected), nego = (Negotiated), contract = (Contracted), new = (Lead, Identified, Registered, Validated), qualified = (Qualified)
            //org_tp : Delivery(delivery), Account(account), 전사 or 조직 ('')
            const { year, month, org_id, deal_stage_cd, org_tp } = req.data;
            /**
             * org_id 파라미터값으로 조직정보 조회
             * 
             */
            const org_col = `case
                when lv1_id = '${org_id}' THEN 'lv1_id'
                when lv2_id = '${org_id}' THEN 'lv2_id'
                when lv3_id = '${org_id}' THEN 'lv3_id'
                when div_id = '${org_id}' THEN 'div_id'
                when hdqt_id = '${org_id}' THEN 'hdqt_id'
                when team_id = '${org_id}' THEN 'team_id'
                end as org_level`;
            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', 'org_name'])
                .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`;

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error
            let org_col_nm = orgInfo.org_level;
            if(deal_stage_cd !== 'qualified'){
                let pl_col_list = [
                    'biz_tp_account_cd',
                    'biz_tp_account_nm',
                    'deal_stage_cd',
                    'biz_opp_nm',
                    'biz_opp_no_sfdc',
                    'cls_rsn_tp_cd',
                    'cls_rsn_tp_nm',
                    'deal_stage_chg_dt',
                    `ifnull(rodr_year_amt,0)/100000000 as rodr_year_amt`
                ];
                let pl_groupBy = [
                    'biz_tp_account_cd',
                    'biz_tp_account_nm',
                    'deal_stage_cd',
                    'biz_opp_nm',
                    'biz_opp_no_sfdc',
                    'cls_rsn_tp_cd',
                    'cls_rsn_tp_nm',
                    'deal_stage_chg_dt',
                    `rodr_year_amt`
                ];
                let s_first_day = new Date(year, month, 1).getDate().toString().padStart(2, '0'),
                    s_last_day = new Date(year, month, 0).getDate().toString().padStart(2, '0');
                let s_first_date = `${year}-${month}-${s_first_day}`
                let s_last_date = `${year}-${month}-${s_last_day}`
                
                let s_order_by = `rodr_year_amt desc`
        
                let pl_where_conditions = { year: year, deal_stage_chg_dt: { between: s_first_date, and: s_last_date }, weekly_yn: false}
        
                //deal_stage_cd : lost = (Deal Lost, Deselected), nego = (Negotiated), contract = (Contracted), new = (Lead, Identified, Registered, Validated)
                if(deal_stage_cd === 'lost'){
                    pl_where_conditions = {...pl_where_conditions, deal_stage_cd:{in:['Deal Lost','Deselected']}};
                }else if(deal_stage_cd === 'new'){
                    pl_where_conditions = {...pl_where_conditions, deal_stage_cd:'Lead'};
                }else if(deal_stage_cd === 'nego'){
                    pl_where_conditions = {...pl_where_conditions, deal_stage_cd:'Negotiated'};
                }else if(deal_stage_cd === 'contract'){
                    pl_where_conditions = {...pl_where_conditions, deal_stage_cd:'Contracted'};
                }
                
                if(org_tp === 'account'){
                    pl_where_conditions = {...pl_where_conditions,org_tp : org_tp}
                }
                let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
                
                const [pl_data] = await Promise.all([
                    SELECT.from(pl_view).columns(pl_col_list).where(pl_where).orderBy(s_order_by).groupBy(...pl_groupBy)
                ])
                if(!pl_data.length){
                    //return req.res.status(204).send();
                return []
                }
                let o_result = {}
                let o_etc = {biz_tp_account_nm:'기타',rodr_amt:0,rodr_cnt:0}
                pl_data.forEach((pl, i) => {
                    if (i < 4) {
                        o_result[`${pl.biz_opp_no_sfdc}`] = {
                            deal_stage_cd: pl.deal_stage_cd,
                            biz_opp_nm: pl.biz_opp_nm,
                            biz_tp_account_nm: pl.biz_tp_account_nm,
                            cls_rsn_tp_nm: pl.cls_rsn_tp_nm,
                            rodr_amt: pl?.rodr_year_amt??0
                        }
                    } else {
                        if(!o_etc['biz_opp_nm']){
                            o_etc['biz_opp_nm']=pl.biz_tp_account_nm
                            o_etc['cls_rsn_tp_nm']=''
                        }
                        o_etc['rodr_amt'] += pl?.rodr_year_amt??0
                        o_etc['rodr_cnt']++
                    }
                })
                let a_result = Object.values(o_result).sort((a, b) => b["rodr_amt"] - a["rodr_amt"])
                if(pl_data.length > 4){
                    a_result.push(o_etc)
                }
                aRes.push(...a_result)
            }else{
                let pl_col_list = [
                    'biz_tp_account_cd',
                    'biz_tp_account_nm',
                    'deal_stage_cd',
                    'rodr_ccorg_cd',
                    'expected_contract_date',
                    'biz_opp_nm',
                    'biz_opp_no_sfdc',
                    'deal_stage_chg_dt',
                    `ifnull(rodr_year_amt,0)/100000000 as rodr_year_amt`
                ];
                let s_first_day = new Date(year, month, 1).getDate().toString().padStart(2, '0'),
                    s_last_day = new Date(year, month, 0).getDate().toString().padStart(2, '0');
                let s_first_date = `${year}-${month}-${s_first_day}`
                let s_last_date = `${year}-${month}-${s_last_day}`
                let s_order_by = `rodr_year_amt desc`
        
                let pl_where_conditions = { year: year, expected_contract_date: { between: s_first_date, and: s_last_date }, weekly_yn: false, [org_col_nm]: org_id, deal_stage_cd:'Qualified' }
                let sfdc_where_conditions = { year: year, expected_contract_date: { between: s_first_date, and: s_last_date }, deal_stage_cd:'Qualified' }
        
                if(org_tp === 'account' || org_tp === 'delivery'){
                    pl_where_conditions = {...pl_where_conditions,org_tp : org_tp}
                }
                
                const [pl_data, sfdc_contract_data, org_data] = await Promise.all([
                    SELECT.from(pl_view).columns(pl_col_list).where(pl_where_conditions).orderBy(s_order_by),
                    SELECT.from(sfdc_contract_view).columns(['biz_opp_no_sfdc','sale_ccorg_cd']).where(sfdc_where_conditions).groupBy('biz_opp_no_sfdc','sale_ccorg_cd'),
                    SELECT.from(org_full_level).columns(['org_ccorg_cd','org_name','div_name'])
                ])
                if(!pl_data.length){
                    //return req.res.status(204).send();
                return []
                }
                pl_data.forEach(pl => {
                    let a_sfdc_contract = sfdc_contract_data.filter(sfdc => sfdc.biz_opp_no_sfdc === pl.biz_opp_no_sfdc)
                    let s_delivery_div_name = org_data.find(org => org.org_ccorg_cd === pl.rodr_ccorg_cd).div_name
                    a_sfdc_contract.forEach(sfdc => {
                        let s_account_div_name = org_data.find(org => org.org_ccorg_cd === sfdc.sale_ccorg_cd).div_name
                        let o_temp = {
                            deal_stage_cd: pl.deal_stage_cd,
                            account_div_name:s_account_div_name,
                            delivery_div_name:s_delivery_div_name,
                            biz_opp_nm:pl.biz_opp_nm,
                            biz_tp_account_nm:pl.biz_tp_account_nm,
                            expected_contract_date:pl?.expected_contract_date ?? '',
                            rodr_amt:pl?.rodr_year_amt??0,
                        }
                        aRes.push(o_temp)
                    })
                })
            }
            aRes.sort((a, b) => b["rodr_amt"] - a["rodr_amt"])
            return aRes;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}