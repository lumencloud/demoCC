module.exports = (srv) => {
    srv.on('get_actual_rohc_account_oi', async (req) => {

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
         * common_target
         * 조직 별 연단위 목표금액
         */
        const target = db.entities('common').target_view;
        /**
         * pl.wideview_unpivot_view [실적]
         * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_unpivot_view;
        /**
         * sga.wideview_unpivot_view [sg&a 집계]
         * [부문/본부/팀 + 년,month_amt,금액] 프로젝트 판관비 집계 뷰
         */
        const sga_view = db.entities('sga').wideview_unpivot_view;
        /**
         * rsp.wideview_unpivot_view [비용 집계]
         * [부문/본부/팀 + 년,month_amt,금액] 프로젝트 비용 집계 뷰
         */
        const rsp_view = db.entities('rsp').wideview_unpivot_view;
        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;

        const account_view = db.entities('common').account
        // =================================================================================

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

        // QUERY 공통 파라미터 선언
        /** 
         * 타겟 뷰 조회용 컬럼
         */
        const target_col_list = [
            'year', 
            'sum(ifnull(rohc_target,0)) as rohc_target'
        ];
        const target_where_conditions = {'is_total' : true, 'year': { in: [year, last_year] } };
        const target_groupBy_cols = ['year']
        /**
         * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const pl_col_list = ['year', 'biz_tp_account_cd', 'sum(ifnull(margin_amount_sum,0)) as margin_amount_sum'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month, 'src_type': { 'not in': ['WO', 'D']}};
        const pl_groupBy_cols = ['year', 'biz_tp_account_cd'];
        /**
         * SG&A 조회용 컬럼
         * shared_exp_yn false = 사업 / true = 전사
         */
        const sga_col_list = ['year',
            '(sum(ifnull(labor_amount_sum,0)) + sum(ifnull(iv_amount_sum,0)) + sum(ifnull(exp_amount_sum,0))) as amount_sum'];
            const sga_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month, 'is_delivery': true, 'shared_exp_yn':false };
        const sga_groupBy_cols = ['year'];

        // rsp 조회용 정보
        const rsp_col_list = ['year', 'biz_tp_account_cd', 'sum(ifnull(total_amt_sum,0)) as total_amt_sum'];
        const rsp_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month, 'is_delivery': true };
        const rsp_groupBy_cols = ['year', 'biz_tp_account_cd'];

        /**
         * +++++ TBD +++++
         * 권한 체크하여 사용자가 조회 가능한 조직인지 판별 후 코드 진행
         */

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
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd'])
            .where({ 'org_id': org_id });

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        // ccorg_cd 만 가지고 있는 경우 조회조건으로 사용

        // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
        let target_column = org_col_nm === 'div_id' ? [...target_col_list,'hdqt_id as id','hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...target_col_list,'team_id as id','team_name as name'] : [...target_col_list,'div_id as id','div_name as name'];
        let target_where = org_col_nm === 'lv1_id' ? target_where_conditions : {...target_where_conditions, [org_col_nm]: org_id};
        let target_groupBy = org_col_nm === 'div_id' ? [...target_groupBy_cols,'hdqt_id','hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...target_groupBy_cols,'team_id','team_name'] : [...target_groupBy_cols,'div_id','div_name'];

        let pl_column = pl_col_list;
        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
        let pl_groupBy = pl_groupBy_cols;

        let sga_column = sga_col_list;
        let sga_where = org_col_nm === 'lv1_id' ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id };
        let sga_groupBy = sga_groupBy_cols;

        let rsp_column = rsp_col_list;
        let rsp_where = org_col_nm === 'lv1_id' ? rsp_where_conditions : { ...rsp_where_conditions, [org_col_nm]: org_id };
        let rsp_groupBy = rsp_groupBy_cols;

        // DB 쿼리 실행 (병렬)
        const [target_data,pl_data,sga_data, rsp_data,account_data] = await Promise.all([
            SELECT.from(target).columns(target_column).where(target_where).groupBy(...target_groupBy),
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
            SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
            SELECT.from(account_view).columns(['biz_tp_account_cd','biz_tp_account_nm','sort_order'])
        ]);


        let a_curr_target = target_data.filter(oTarget => oTarget.year === year);
        let a_last_target = target_data.filter(oTarget => oTarget.year === last_year);

        let o_data = {}
        
        pl_data.forEach(o_pl=>{
            let o_find_account = account_data.find(o_account => o_account.biz_tp_account_cd === o_pl.biz_tp_account_cd);
            if(o_find_account){
                if(!o_data[`${o_pl.biz_tp_account_cd}`]){
                    // const o_curr_target = a_curr_target.find(o_target=>o_target.id === o_pl.id)
                    // const o_last_target = a_last_target.find(o_target=>o_target.id === o_pl.id)
                    o_data[`${o_pl.biz_tp_account_cd}`]={account_cd:o_pl.biz_tp_account_cd, account_nm: o_find_account.biz_tp_account_nm, sort_order: o_find_account.sort_order}
                }
                if(o_pl.year = year){
                    o_data[`${o_pl.biz_tp_account_cd}`]['curr_margin'] = (o_pl?.margin_amount_sum ?? 0)
                }else{
                    o_data[`${o_pl.biz_tp_account_cd}`]['last_margin'] = (o_pl?.margin_amount_sum ?? 0)
                }
            }
        })
        rsp_data.forEach(o_rsp=>{
            let o_find_account = account_data.find(o_account => o_account.biz_tp_account_cd === o_rsp.biz_tp_account_cd);
            if(o_find_account){
                if(!o_data[`${o_rsp.biz_tp_account_cd}`]){
                    // const o_curr_target = a_curr_target.find(o_target=>o_target.id === o_rsp.id)
                    // const o_last_target = a_last_target.find(o_target=>o_target.id === o_rsp.id)
                    o_data[`${o_rsp.biz_tp_account_cd}`]={account_cd:o_rsp.biz_tp_account_cd, account_nm: o_find_account.biz_tp_account_nm, sort_order: o_find_account.sort_order}
                }
                if(o_rsp.year = year){
                    o_data[`${o_rsp.biz_tp_account_cd}`]['curr_total_amt_sum'] = (o_rsp?.total_amt_sum ?? 0)
                }else{
                    o_data[`${o_rsp.biz_tp_account_cd}`]['last_total_amt_sum'] = (o_rsp?.total_amt_sum ?? 0)
                }
            }
        })
        // sga_data.forEach(o_sga=>{
        //     if(!o_data[`${o_sga.id}`]){
        //         const o_curr_target = a_curr_target.find(o_target=>o_target.id === o_sga.id)
        //         const o_last_target = a_last_target.find(o_target=>o_target.id === o_sga.id)
        //         o_data[`${o_sga.id}`]={id:o_sga.id, name:o_sga.name,curr_target:(o_curr_target?.rohc_target ?? 0),last_target:(o_last_target?.rohc_target ?? 0)}
        //     }
        //     if(o_sga.year = year){
        //         o_data[`${o_sga.id}`]['curr_amount_sum'] = (o_sga?.amount_sum ?? 0)
        //     }else{
        //         o_data[`${o_sga.id}`]['last_amount_sum'] = (o_sga?.amount_sum ?? 0)
        //     }
        // })

        let a_data = Object.values(o_data);

        let o_total = {"display_order": 1, "account_cd": 'total', "account_nm": '합계'}

        a_data.forEach((o_rohc_data,i)=>{

            const o_temp =
            {
                "display_order": o_rohc_data.sort_order+1,
                "account_cd": o_rohc_data.account_cd,
                "account_nm": o_rohc_data.account_nm,
                "target_curr_y_value": o_rohc_data?.curr_target ?? 0,
                "actual_curr_ym_value": (o_rohc_data?.curr_total_amt_sum ?? 0) === 0 ? 0 : (o_rohc_data?.curr_margin ?? 0)/o_rohc_data.curr_total_amt_sum,
                "actual_last_ym_value": (o_rohc_data?.last_total_amt_sum ?? 0) === 0 ? 0 : (o_rohc_data?.last_margin ?? 0)/o_rohc_data.last_total_amt_sum,
                "actual_curr_ym_rate": (o_rohc_data?.curr_target ?? 0) === 0 || (o_rohc_data?.curr_total_amt_sum ?? 0) === 0 ? 0 : ((o_rohc_data?.curr_margin ?? 0)/o_rohc_data.curr_total_amt_sum)/(o_rohc_data.curr_target*100000000),
                "actual_last_ym_rate": (o_rohc_data?.last_target ?? 0) === 0 || (o_rohc_data?.last_total_amt_sum ?? 0) === 0 ? 0 : ((o_rohc_data?.last_margin ?? 0)/o_rohc_data.last_total_amt_sum)/(o_rohc_data.last_target*100000000),
            };

            o_total['target_curr_y_value'] = (o_total['target_curr_y_value'] || 0) + o_temp['target_curr_y_value']
            o_total['actual_curr_ym_value'] = (o_total['actual_curr_ym_value'] || 0) + o_temp['actual_curr_ym_value']
            o_total['actual_last_ym_value'] = (o_total['actual_last_ym_value'] || 0) + o_temp['actual_last_ym_value']
            oResult.push(o_temp);
        })
        o_total['actual_curr_ym_rate'] = o_total['target_curr_y_value'] === 0 ? 0 : o_total['actual_curr_ym_value'] / (o_total['target_curr_y_value'] * 100000000) * 100
        let o_result_total = {
            "display_order": o_total['display_order'],
            "account_cd": o_total['account_cd'],
            "account_nm": o_total['account_nm'],
            "target_curr_y_value": o_total['target_curr_y_value'],
            "actual_curr_ym_value": o_total['actual_curr_ym_value'],
            "actual_last_ym_value": o_total['actual_last_ym_value'],
            "actual_curr_ym_rate": o_total['actual_curr_ym_rate'],
            "actual_last_ym_rate": 0,
        }
        oResult.push(o_result_total)

        return oResult
    });
}