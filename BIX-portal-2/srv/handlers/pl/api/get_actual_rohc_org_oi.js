module.exports = (srv) => {
    srv.on('get_actual_rohc_org_oi', async (req) => {

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
        const target = db.entities('common').org_target_sum_view;
        /**
         * pl.wideview_unpivot_view [실적]
         * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_org_view;
        /**
         * sga.wideview_view [sg&a 집계]
         * [부문/본부/팀 + 년,month_amt,금액] 프로젝트 판관비 집계 뷰
         */
        const sga_view = db.entities('sga').wideview_view;
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
        let a_margin_column = [];
        for(let i=1;i<=Number(month); i++){
            a_margin_column.push(`sum(ifnull(margin_m${i}_amt,0))`)
        }
        let s_margin_column = "("+a_margin_column.join(' + ')+') as margin_amount_sum';
        const pl_col_list = ['year', 'org_order', s_margin_column];
        const pl_where_conditions = { 'year': { in: [year, last_year] }};
        const pl_groupBy_cols = ['year', 'org_order'];
        /**
         * SG&A 조회용 컬럼
         * shared_exp_yn false = 사업 / true = 전사
         */
        let a_sga_column = [];
        for (let i = 1; i <= Number(month); i++) {
            a_sga_column.push(`sum(ifnull(labor_m${i}_amt,0))+sum(ifnull(exp_m${i}_amt,0))+sum(ifnull(iv_m${i}_amt,0))`)
        }

        let s_sga_column = "(" + a_sga_column.join(' + ') + ') as amount_sum';

        const sga_col_list = ['year', s_sga_column];
            const sga_where_conditions = { 'year': { in: [year, last_year] }, 'is_delivery': true, 'is_total_cc':{in:[false,null]} };
        const sga_groupBy_cols = ['year'];

        // rsp 조회용 정보
        const rsp_col_list = ['year', 'sum(ifnull(total_amt_sum,0)) as total_amt_sum'];
        const rsp_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month, 'is_delivery': true };
        const rsp_groupBy_cols = ['year'];

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
        let org_ccorg = orgInfo.org_ccorg_cd;
        let org_ccorg_col = org_col_nm.split('_',1) + '_ccorg_cd';
        let search_org, search_org_nm, search_org_ccorg, target_where;
        if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id'){
            search_org = 'div_id';
            search_org_nm = 'div_name';
            search_org_ccorg = 'div_ccorg_cd';
            target_where =  {'total' : false, 'target_year': { in: [year, last_year] }, [org_ccorg_col] : org_ccorg, 'div_ccorg_cd' : {'!=':null}, 'hdqt_ccorg_cd' : null };
        }else if(org_col_nm === 'div_id'){
            search_org = 'hdqt_id';
            search_org_nm = 'hdqt_name';
            search_org_ccorg = 'hdqt_ccorg_cd';
            target_where =  {'total' : false, 'target_year': { in: [year, last_year] }, [org_ccorg_col] : org_ccorg };
        }else if(org_col_nm === 'hdqt_id'){
            search_org = 'team_id';
            search_org_nm = 'team_name';
            search_org_ccorg = 'team_ccorg_cd';
            target_where =  {'total' : false, 'target_year': { in: [year, last_year] }, [org_ccorg_col] : org_ccorg };
        }else{return;};

        const org_query = await SELECT.from(org_full_level).columns([search_org, search_org_nm, search_org_ccorg, 'org_order']).where({ [org_col_nm]: org_id }).orderBy('org_order');

        //조직 리스트
        let org_list = [];
        org_query.forEach(data=>{
            if(!org_list.find(data2=>data2.id === data[search_org]) && data[search_org]){
                let oTemp = {
                    id : data[search_org],
                    name : data[search_org_nm],
                    ccorg : data[search_org_ccorg],
                    org_order : data['org_order']
                };
                org_list.push(oTemp);
            };
        });

        const target_col = ['org_id', 'target_year', 'org_name', 'target_rohc'];
        const target_ent_where = {'total' : true, 'target_year': { in: [year, last_year] }};

        // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
        let pl_column = org_col_nm === 'div_id' ? [...pl_col_list,'hdqt_id as id','hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_col_list,'team_id as id','team_name as name'] : [...pl_col_list,'div_id as id','div_name as name'];
        let pl_where = org_col_nm === 'div_id' ? {...pl_where_conditions,'hdqt_id':{'!=':null},and:{[org_col_nm]: org_id}} : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? {...pl_where_conditions,'team_id':{'!=':null},and:{[org_col_nm]: org_id}} : {...pl_where_conditions,'div_id':{'!=':null},and:{[org_col_nm]: org_id}};
        let pl_groupBy = org_col_nm === 'div_id' ? [...pl_groupBy_cols,'hdqt_id','hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_groupBy_cols,'team_id','team_name'] : [...pl_groupBy_cols,'div_id','div_name'];

        let sga_column = org_col_nm === 'div_id' ? [...sga_col_list,'hdqt_id as id','hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...sga_col_list,'team_id as id','team_name as name'] : [...sga_col_list,'div_id as id','div_name as name'];
        let sga_where = org_col_nm === 'div_id' ? {...sga_where_conditions,'hdqt_id':{'!=':null},and:{[org_col_nm]: org_id}} : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? {...sga_where_conditions,'team_id':{'!=':null},and:{[org_col_nm]: org_id}} : {...sga_where_conditions,'div_id':{'!=':null},and:{[org_col_nm]: org_id}};
        let sga_groupBy = org_col_nm === 'div_id' ? [...sga_groupBy_cols,'hdqt_id','hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...sga_groupBy_cols,'team_id','team_name'] : [...sga_groupBy_cols,'div_id','div_name'];

        let rsp_column = org_col_nm === 'div_id' ? [...rsp_col_list,'hdqt_id as id','hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...rsp_col_list,'team_id as id','team_name as name'] : [...rsp_col_list,'div_id as id','div_name as name'];
        let rsp_where = org_col_nm === 'div_id' ? {...rsp_where_conditions,'hdqt_id':{'!=':null},and:{[org_col_nm]: org_id}} : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? {...rsp_where_conditions,'team_id':{'!=':null},and:{[org_col_nm]: org_id}} : {...rsp_where_conditions,'div_id':{'!=':null},and:{[org_col_nm]: org_id}};
        let rsp_groupBy = org_col_nm === 'div_id' ? [...rsp_groupBy_cols,'hdqt_id','hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...rsp_groupBy_cols,'team_id','team_name'] : [...rsp_groupBy_cols,'div_id','div_name'];

        // DB 쿼리 실행 (병렬)
        let target_data,pl_data,sga_data, rsp_data, target_ent_data;
        if(org_col_nm === 'lv1_id'){
            [target_data,pl_data,sga_data, rsp_data, target_ent_data] = await Promise.all([
                SELECT.from(target).columns(target_col).where(target_where),
                SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy).orderBy(['org_order']),
                SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
                SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
                SELECT.from(target).columns(target_col).where(target_ent_where)
            ]);
        }else{
            [target_data,pl_data,sga_data, rsp_data] = await Promise.all([
                SELECT.from(target).columns(target_col).where(target_where),
                SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy).orderBy(['org_order']),
                SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
                SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy)
            ]);
        };

        let oCurrTargetEnt={}, oLastTargetEnt={};
        if(org_col_nm === 'lv1_id'){
            target_ent_data.forEach(data=>{
                if(data.target_year === year.toString()){
                    oCurrTargetEnt = data;
                }else if(data.target_year === last_year.toString()){
                    oLastTargetEnt = data;
                };
            });
        };

        let a_curr_target = target_data.filter(oTarget => oTarget.target_year === year);
        let a_last_target = target_data.filter(oTarget => oTarget.target_year === last_year);
        let o_data = {}
        pl_data.forEach(o_pl=>{
            if(!o_data[`${o_pl.id}`]){
                const o_curr_target = a_curr_target.find(o_target=>o_target.org_id === o_pl.id)
                const o_last_target = a_last_target.find(o_target=>o_target.org_id === o_pl.id)
                o_data[`${o_pl.id}`]={id:o_pl.id, name:o_pl.name,curr_target:(o_curr_target?.target_rohc ?? 0),last_target:(o_last_target?.target_rohc ?? 0)}
            }
            if(o_pl.year = year){
                o_data[`${o_pl.id}`]['curr_margin'] = (o_pl?.margin_amount_sum ?? 0)
            }else{
                o_data[`${o_pl.id}`]['last_margin'] = (o_pl?.margin_amount_sum ?? 0)
            }
        })
        rsp_data.forEach(o_rsp=>{
            if(!o_data[`${o_rsp.id}`]){
                const o_curr_target = a_curr_target.find(o_target=>o_target.org_id === o_rsp.id)
                const o_last_target = a_last_target.find(o_target=>o_target.org_id === o_rsp.id)
                o_data[`${o_rsp.id}`]={id:o_rsp.id, name:o_rsp.name,curr_target:(o_curr_target?.target_rohc ?? 0),last_target:(o_last_target?.target_rohc ?? 0)}
            }
            if(o_rsp.year = year){
                o_data[`${o_rsp.id}`]['curr_total_amt_sum'] = (o_rsp?.total_amt_sum ?? 0)
            }else{
                o_data[`${o_rsp.id}`]['last_total_amt_sum'] = (o_rsp?.total_amt_sum ?? 0)
            }
        })
        sga_data.forEach(o_sga=>{
            if(!o_data[`${o_sga.id}`]){
                const o_curr_target = a_curr_target.find(o_target=>o_target.org_id === o_sga.id)
                const o_last_target = a_last_target.find(o_target=>o_target.org_id === o_sga.id)
                o_data[`${o_sga.id}`]={id:o_sga.id, name:o_sga.name,curr_target:(o_curr_target?.target_rohc ?? 0),last_target:(o_last_target?.target_rohc ?? 0)}
            }
            if(o_sga.year = year){
                o_data[`${o_sga.id}`]['curr_amount_sum'] = (o_sga?.amount_sum ?? 0)
            }else{
                o_data[`${o_sga.id}`]['last_amount_sum'] = (o_sga?.amount_sum ?? 0)
            }
        })

        let a_data = Object.values(o_data);
        let o_total = {"display_order": 1, "org_id": 'total', "org_nm": '합계'};

        org_list.forEach((data,i)=>{
            const o_temp =
                {
                    "display_order": i+2,
                    "org_id": data.id,
                    "org_nm": data.name,
                    "target_curr_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0
                };
            a_data.forEach(o_rohc_data=>{
                if(o_rohc_data.id === data.id){
                    o_temp["target_curr_y_value"] = o_rohc_data?.curr_target ?? 0;
                    o_temp["actual_curr_ym_value"] = (o_rohc_data?.curr_total_amt_sum ?? 0) === 0 ? 0 : ((o_rohc_data?.curr_margin ?? 0)-(o_rohc_data?.curr_amount_sum ?? 0))/o_rohc_data.curr_total_amt_sum;
                    o_temp["actual_last_ym_value"] = (o_rohc_data?.last_total_amt_sum ?? 0) === 0 ? 0 : ((o_rohc_data?.last_margin ?? 0)-(o_rohc_data?.last_amount_sum ?? 0))/o_rohc_data.last_total_amt_sum;
                    o_temp["actual_curr_ym_rate"] = Number(o_rohc_data?.curr_target ?? 0) === 0 || (o_rohc_data?.curr_total_amt_sum ?? 0) === 0 ? 0 : (((o_rohc_data?.curr_margin ?? 0)-(o_rohc_data?.curr_amount_sum ?? 0))/o_rohc_data.curr_total_amt_sum)/Number(o_rohc_data.curr_target);
                    o_temp["actual_last_ym_rate"] = Number(o_rohc_data?.last_target ?? 0) === 0 || (o_rohc_data?.last_total_amt_sum ?? 0) === 0 ? 0 : (((o_rohc_data?.last_margin ?? 0)-(o_rohc_data?.last_amount_sum ?? 0))/o_rohc_data.last_total_amt_sum)/Number(o_rohc_data.last_target);
                };
                if(i === 0){
                    o_total['actual_curr_ym_value'] = (o_total['actual_curr_ym_value'] || 0) + (o_rohc_data?.curr_total_amt_sum ?? 0) === 0 ? 0 : ((o_rohc_data?.curr_margin ?? 0)-(o_rohc_data?.curr_amount_sum ?? 0))/o_rohc_data.curr_total_amt_sum;
                    o_total['actual_last_ym_value'] = (o_total['actual_last_ym_value'] || 0) + (o_rohc_data?.last_total_amt_sum ?? 0) === 0 ? 0 : ((o_rohc_data?.last_margin ?? 0)-(o_rohc_data?.last_amount_sum ?? 0))/o_rohc_data.last_total_amt_sum;
                };
            })
            oResult.push(o_temp);
        });

        let iLastYearTotalTarget=0;
        if(org_col_nm === 'lv1_id'){
            o_total['target_curr_y_value'] = Number(oCurrTargetEnt?.target_rohc ?? 0);
            iLastYearTotalTarget = Number(oLastTargetEnt?.target_rohc ?? 0);
        }else if(org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id'){
            o_total['target_curr_y_value'] = 0;
            target_data.forEach(data => {
                if(data.target_year === year){
                    o_total['target_curr_y_value'] += Number(data?.target_rohc ?? 0);
                }else if(data.target_year === last_year){
                    iLastYearTotalTarget += Number(data?.target_rohc ?? 0);
                };
            });
        }else if(org_col_nm === 'div_id' || org_col_nm === 'hdqt_id'){
            let curr = a_curr_target.find(o_target=>o_target.org_id === org_id);
            let last = a_last_target.find(o_target=>o_target.org_id === org_id);
            o_total['target_curr_y_value'] = Number(curr?.["target_rohc"] ?? 0);
            iLastYearTotalTarget = Number(last?.["target_rohc"] ?? 0);
        };

        o_total['actual_curr_ym_rate'] = o_total['target_curr_y_value'] === 0 ? 0 : o_total['actual_curr_ym_value'] / (Number(o_total['target_curr_y_value']) * 100000000) * 100;
        o_total['actual_last_ym_rate'] = iLastYearTotalTarget === 0 ? 0 : o_total['actual_last_ym_value'] / (iLastYearTotalTarget * 100000000) * 100;

        let o_result_total = {
            "display_order": o_total['display_order'],
            "org_id": o_total['org_id'],
            "org_nm": o_total['org_nm'],
            "target_curr_y_value": o_total['target_curr_y_value'],
            "actual_curr_ym_value": o_total['actual_curr_ym_value'],
            "actual_last_ym_value": o_total['actual_last_ym_value'],
            "actual_curr_ym_rate": o_total['actual_curr_ym_rate'],
            "actual_last_ym_rate": o_total['actual_last_ym_rate'],
        }
        oResult.unshift(o_result_total)
   
        return oResult
    });
}