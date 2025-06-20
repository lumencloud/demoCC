module.exports = (srv) => {
    srv.on('get_actual_sale_sub_company_pl', async (req) => {

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
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;
        // =================================================================================

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();
        const a_list = ['합계','미국법인','유럽법인','중국법인','일본법인']
        const a_type_list = ['매출','마진','마진률']
        let i_index = 1;
        for(const list of a_list){
            for(const type of a_type_list){
                const o_temp = {
                    "display_order": i_index,
                    "org_id": list,
                    "org_nm": list,
                    "type": type,
                    "target_curr_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                };
                i_index++
                oResult.push(o_temp)
            }
        }
        return oResult
        // QUERY 공통 파라미터 선언
        /** 
         * 타겟 뷰 조회용 컬럼
         */
        const target_col_list = [
            'year', 'org_id', 'org_name', 'org_parent',
            'sum(ifnull(sale_target,0)) as sale_target', 
            'sum(ifnull(margin_rate_target,0)*ifnull(sale_target,0)/100) as margin_target'
        ];
        const target_where_conditions = {'is_total' : true, 'year': { in: [year, last_year] } };
        const target_groupBy_cols = ['year','org_id', 'org_name', 'org_parent']
        /**
         * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const pl_col_list = [
            'year', 'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(margin_amount_sum,0)) as margin_amount_sum'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month}; // src_type : 'S'자회사 추가 필요
        const pl_groupBy_cols = ['year'];

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

        let pl_column = org_col_nm === 'div_id' ? [...pl_col_list,'hdqt_id as id','hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_col_list,'team_id as id','team_name as name'] : [...pl_col_list,'div_id as id','div_name as name'];
        let pl_where = org_col_nm === 'div_id' ? {...pl_where_conditions,'hdqt_id':{'!=':null},and:{[org_col_nm]: org_id}} : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? {...pl_where_conditions,'team_id':{'!=':null},and:{[org_col_nm]: org_id}} : {...pl_where_conditions,'div_id':{'!=':null},and:{[org_col_nm]: org_id}};
        let pl_groupBy = org_col_nm === 'div_id' ? [...pl_groupBy_cols,'hdqt_id','hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_groupBy_cols,'team_id','team_name'] : [...pl_groupBy_cols,'div_id','div_name'];

        // DB 쿼리 실행 (병렬)
        const [target_data,pl_data] = await Promise.all([
            SELECT.from(target).columns(target_column).where(target_where).groupBy(...target_groupBy),
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy)
        ]);

        let a_curr_target = target_data.filter(oTarget => oTarget.year === year);
        let a_last_target = target_data.filter(oTarget => oTarget.year === last_year);

        let o_data = {}
        
        let o_total = {
            sale: {"type": "매출"},
            margin: {"type": "마진"},
            margin_rate: {"type": "마진율"},
        }; 
        
        pl_data.forEach(o_pl=>{
            if(!o_data[`${o_pl.id}`]){
                o_data[`${o_pl.id}`]={id:o_pl.id, name:o_pl.name}
            }
            if(o_pl.year = year){
                const o_curr_target = a_curr_target.find(o_target=>o_target.id === o_pl.id)
                o_data[`${o_pl.id}`]['curr_sale'] = o_pl.sale_amount_sum
                o_data[`${o_pl.id}`]['curr_margin'] = o_pl.margin_amount_sum
                o_data[`${o_pl.id}`]['curr_sale_target'] = o_curr_target?.sale_target ?? 0
                o_data[`${o_pl.id}`]['curr_margin_target'] = o_curr_target?.margin_target ?? 0
                o_data[`${o_pl.id}`]['curr_margin_rate_target'] = (o_curr_target?.sale_target ?? 0) === 0 ? 0 : (o_curr_target?.margin_target ?? 0)/o_curr_target.sale_target * 100
            }else{
                const o_last_target = a_last_target.find(o_target=>o_target.id === o_pl.id)
                o_data[`${o_pl.id}`]['last_sale'] = o_pl.sale_amount_sum
                o_data[`${o_pl.id}`]['last_margin'] = o_pl.margin_amount_sum
                o_data[`${o_pl.id}`]['last_sale_target'] = o_last_target?.sale_target ?? 0
                o_data[`${o_pl.id}`]['last_margin_target'] = o_last_target?.margin_target ?? 0
                o_data[`${o_pl.id}`]['last_margin_rate_target'] = (o_last_target?.sale_target ?? 0) === 0 ? 0 : (o_last_target?.margin_target ?? 0)/o_last_target.sale_target * 100
            }
        })

        let a_pl_data = Object.values(o_data);

        a_pl_data.forEach((o_pl_data,i)=>{

            const sale_data =
            {
                "display_order": ((i+1)*3)-2,
                "org_id": o_pl_data.id,
                "org_nm": o_pl_data.name,
                "type": "매출",
                "target_curr_y_value": o_pl_data?.["curr_sale_target"] ?? 0,
                "actual_curr_ym_value": o_pl_data?.["curr_sale"] ?? 0,
                "actual_last_ym_value": o_pl_data?.["last_sale"] ?? 0,
                "actual_curr_ym_rate": (o_pl_data?.["curr_sale_target"] ?? 0) === 0 ? 0 : (o_pl_data?.["curr_sale"] ?? 0) / (o_pl_data["curr_sale_target"]*100000000) * 100,
                "actual_last_ym_rate": (o_pl_data?.["last_sale_target"] ?? 0) === 0 ? 0 : (o_pl_data?.["last_sale"] ?? 0) / (o_pl_data["last_sale_target"]*100000000) * 100,
            };
            const margin_data =
            {
                "display_order": ((i+1)*3)-1,
                "org_id": o_pl_data.id,
                "org_nm": o_pl_data.name,
                "type": "마진",
                "target_curr_y_value": o_pl_data?.["curr_margin_target"] ?? 0,
                "actual_curr_ym_value": o_pl_data?.["curr_margin"] ?? 0,
                "actual_last_ym_value": o_pl_data?.["last_margin"] ?? 0,
                "actual_curr_ym_rate": (o_pl_data?.["curr_margin_target"] ?? 0) === 0 ? 0 : (o_pl_data?.["curr_margin"] ?? 0) / (o_pl_data["curr_margin_target"]*100000000) * 100,
                "actual_last_ym_rate": (o_pl_data?.["last_margin_target"] ?? 0) === 0 ? 0 : (o_pl_data?.["last_margin"] ?? 0) / (o_pl_data["last_margin_target"]*100000000) * 100,
            };
            const margin_rate_data =
            {
                "display_order": ((i+1)*3),
                "org_id": o_pl_data.id,
                "org_nm": o_pl_data.name,
                "type": "마진율",
                "target_curr_y_value": o_pl_data?.["curr_margin_rate_target"] ?? 0,
                "actual_curr_ym_value": (o_pl_data?.["curr_sale"] ?? 0) === 0 ? 0 : (o_pl_data?.["curr_margin"] ?? 0)/o_pl_data["curr_sale"]*100,
                "actual_last_ym_value": (o_pl_data?.["last_sale"] ?? 0) === 0 ? 0 : (o_pl_data?.["last_margin"] ?? 0)/o_pl_data["last_sale"]*100,
                "actual_curr_ym_rate": (o_pl_data?.["curr_margin_rate_target"] ?? 0) === 0 || (o_pl_data?.["curr_sale"] ?? 0) === 0 ? 0 : ((o_pl_data?.["curr_margin"] ?? 0)/o_pl_data["curr_sale"]*100) / o_pl_data["curr_margin_rate_target"] * 100,
                "actual_last_ym_rate": (o_pl_data?.["last_margin_rate_target"] ?? 0) === 0 || (o_pl_data?.["last_sale"] ?? 0) === 0 ? 0 : ((o_pl_data?.["last_margin"] ?? 0)/o_pl_data["last_sale"]*100) / o_pl_data["last_margin_rate_target"] * 100,
            };
            o_total['sale']['target_curr_y_value'] = (o_total['sale']['target_curr_y_value'] || 0) + (o_pl_data?.["curr_sale_target"] ?? 0)
            o_total['sale']['actual_curr_ym_value'] = (o_total['sale']['actual_curr_ym_value'] || 0) + (o_pl_data?.["curr_sale"] ?? 0)
            o_total['sale']['actual_last_ym_value'] = (o_total['sale']['actual_last_ym_value'] || 0) + (o_pl_data?.["last_sale"] ?? 0)
            o_total['margin']['target_curr_y_value'] = (o_total['margin']['target_curr_y_value'] || 0) + (o_pl_data?.["curr_margin_target"] ?? 0)
            o_total['margin']['actual_curr_ym_value'] = (o_total['margin']['actual_curr_ym_value'] || 0) + (o_pl_data?.["curr_margin"] ?? 0)
            o_total['margin']['actual_last_ym_value'] = (o_total['margin']['actual_last_ym_value'] || 0) + (o_pl_data?.["last_margin"] ?? 0)
            oResult.push(sale_data,margin_data,margin_rate_data);
        })
        o_total['margin_rate']['actual_curr_ym_value'] = (o_total['sale']?.['actual_curr_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin']?.['actual_curr_ym_value'] ?? 0)/o_total['sale']['actual_curr_ym_value']*100;
        o_total['margin_rate']['actual_last_ym_value'] = (o_total['sale']?.['actual_last_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin']?.['actual_last_ym_value'] ?? 0)/o_total['sale']['actual_last_ym_value']*100;

        let a_total_data = Object.values(o_total);
        a_total_data.forEach((o_total, i)=>{
            let o_temp = {
                "display_order": i+1,
                "org_id": "total",
                "org_nm": "합계",
                "type": o_total.type,
                "target_curr_y_value": o_total?.target_curr_y_value ?? 0,
                "actual_curr_ym_value": o_total?.actual_curr_ym_value ?? 0,
                "actual_last_ym_value": o_total?.actual_last_ym_value ?? 0,
                "actual_curr_ym_rate": (o_total?.target_curr_y_value ?? 0) === 0 ? 0 : (o_total?.actual_curr_ym_value ?? 0)/(o_total.target_curr_y_value*100000000)*100,
                "actual_last_ym_rate": (o_total?.target_last_y_value ?? 0) === 0 ? 0 : (o_total?.actual_last_ym_value ?? 0)/(o_total.target_last_y_value*100000000)*100,
            }
            oResult.push(o_temp);
        })

        return oResult
    });
}