const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_ai_forecast_deal_type_pl', async (req) => {
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
        // deal_stage_cd : lost = (Deal Lost, Deselected), nego = (Negotiated), contract = (Contracted), new = (Lead, Identified, Registered, Validated), qualified = (Qualified)
        // org_tp : Delivery(delivery), Account(account), 전사 or 조직 ('')
        // week : 주차 (1-5), month와 함께 사용하여 특정 주 조회
        // deal_type : DT (biz_tp_account_cd에 'IN' 포함), BAU (biz_tp_account_cd에 'EX' 포함)
        const { year, month, week, org_id, deal_stage_cd, org_tp, deal_type } = req.data;

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
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', 'org_name'])
            .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`;

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error
        let org_col_nm = orgInfo.org_level;

        // 날짜 범위 계산 (주차 계산 로직 추가)
        let s_first_day, s_last_day, s_first_date, s_last_date;
        let weekly_yn = false;

        // week 파라미터가 있으면 주단위 조회, 없으면 월단위 조회
        if (!!week) {
            weekly_yn = true;
            // 해당 월의 특정 주차 계산
            let monthFirstDay = new Date(year, month - 1, 1);
            let monthFirstDayOfWeek = monthFirstDay.getDay(); // 0=일, 1=월, 2=화...
            
            // 첫 주의 월요일 찾기 (월이 수요일에 시작하면 그 전 월요일부터가 1주차)
            let firstMondayOffset = monthFirstDayOfWeek === 0 ? -6 : 1 - monthFirstDayOfWeek;
            let firstMonday = new Date(year, month - 1, 1 + firstMondayOffset);
            
            // 요청한 주차의 월요일과 일요일 계산
            let weekStartMonday = new Date(firstMonday.getTime() + (parseInt(week) - 1) * 7 * 24 * 60 * 60 * 1000);
            let weekEndSunday = new Date(weekStartMonday.getTime() + 6 * 24 * 60 * 60 * 1000);
            
            s_first_date = `${weekStartMonday.getFullYear()}-${String(weekStartMonday.getMonth() + 1).padStart(2, '0')}-${String(weekStartMonday.getDate()).padStart(2, '0')}`;
            s_last_date = `${weekEndSunday.getFullYear()}-${String(weekEndSunday.getMonth() + 1).padStart(2, '0')}-${String(weekEndSunday.getDate()).padStart(2, '0')}`;
        } else {
            // 월단위 날짜 계산 (기존 로직)
            s_first_day = new Date(year, month - 1, 1).getDate().toString().padStart(2, '0');
            s_last_day = new Date(year, month, 0).getDate().toString().padStart(2, '0');
            s_first_date = `${year}-${String(month).padStart(2, '0')}-${s_first_day}`;
            s_last_date = `${year}-${String(month).padStart(2, '0')}-${s_last_day}`;
        }

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
            let s_order_by = `rodr_year_amt desc`
    
            let pl_where_conditions = { year: year, deal_stage_chg_dt: { between: s_first_date, and: s_last_date }, weekly_yn: weekly_yn}
    
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
            
            // org_tp 필터 조건 추가
            if(!!org_tp){
                pl_where_conditions = {...pl_where_conditions,org_tp : org_tp}
            }

            // deal_type 필터 조건 추가 (DT: IN 포함, BAU: EX 포함)
            if(!!deal_type){
                if(deal_type === 'DT'){
                    pl_where_conditions = {...pl_where_conditions, biz_tp_account_cd: {like: '%IN%'}}
                } else if(deal_type === 'BAU'){
                    pl_where_conditions = {...pl_where_conditions, biz_tp_account_cd: {like: '%EX%'}}
                }
            }

            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            
            const [pl_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where).orderBy(s_order_by).groupBy(...pl_groupBy)
            ])
            let o_result = {}
            let o_etc = {biz_tp_account_nm:'기타',rodr_amt:0,rodr_cnt:0}
            pl_data.forEach((pl, i) => {
                if (i < 4) {
                    o_result[`${pl.biz_opp_no_sfdc}`] = {
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
            let s_order_by = `rodr_year_amt desc`
    
            let pl_where_conditions = { year: year, deal_stage_chg_dt: { between: s_first_date, and: s_last_date }, weekly_yn: weekly_yn, [org_col_nm]: org_id, deal_stage_cd:'Qualified' }
            let sfdc_where_conditions = { year: year, deal_stage_chg_dt: { between: s_first_date, and: s_last_date }, deal_stage_cd:'Qualified' }

            // org_tp 필터 조건 추가
            if(!!org_tp){
                pl_where_conditions = {...pl_where_conditions,org_tp : org_tp}
            }

            // deal_type 필터 조건 추가 (DT: IN 포함, BAU: EX 포함)
            if(!!deal_type){
                if(deal_type === 'DT'){
                    pl_where_conditions = {...pl_where_conditions, biz_tp_account_cd: {like: '%IN%'}}
                } else if(deal_type === 'BAU'){
                    pl_where_conditions = {...pl_where_conditions, biz_tp_account_cd: {like: '%EX%'}}
                }
            }
            
            const [pl_data, sfdc_contract_data, org_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where_conditions).orderBy(s_order_by),
                SELECT.from(sfdc_contract_view).columns(['biz_opp_no_sfdc','sale_ccorg_cd']).where(sfdc_where_conditions),
                SELECT.from(org_full_level).columns(['org_ccorg_cd','org_name','div_name'])
            ])
    
            pl_data.forEach(pl => {
                let a_sfdc_contract = sfdc_contract_data.filter(sfdc => sfdc.biz_opp_no_sfdc === pl.biz_opp_no_sfdc)
                let s_delivery_div_name = org_data.find(org => org.org_ccorg_cd === pl.rodr_ccorg_cd)?.div_name || ''
                a_sfdc_contract.forEach(sfdc => {
                    let s_account_div_name = org_data.find(org => org.org_ccorg_cd === sfdc.sale_ccorg_cd)?.div_name || ''
                    let o_temp = {
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
    })
}