const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_sale_relsco_pl', async (req) => {
        /**
         * 핸들러 초기에 권한체크
         */
        // await check_user_auth(req);

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
         * pl.wideview_view [실적]
         * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_view;
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
         * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        let a_sale_column = [];
        let a_margin_column = [];
        for(let i=1;i<=Number(month); i++){
            a_sale_column.push(`sum(ifnull(sale_m${i}_amt,0))`)
            a_margin_column.push(`sum(ifnull(margin_m${i}_amt,0))`)
        }
        let s_sale_column = "("+a_sale_column.join(' + ')+') as sale_amount_sum';
        let s_margin_column = "("+a_margin_column.join(' + ')+') as margin_amount_sum';
        const pl_col_list = [
            'year', 'relsco_yn', s_sale_column, s_margin_column];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { 'not in': ['WA', 'D']}, 'relsco_yn': {'!=': null}};
        const pl_groupBy_cols = ['year', 'relsco_yn'];

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
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', 'org_name'])
            .where({ 'org_id': org_id });

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        let org_col_nm_name = orgInfo['org_name'];
        let search_org, search_org_nm, search_org_ccorg;
        if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id'){
            search_org = 'div_id';
            search_org_nm = 'div_name';
            search_org_ccorg = 'div_ccorg_cd';
        }else if(org_col_nm === 'div_id'){
            search_org = 'hdqt_id';
            search_org_nm = 'hdqt_name';
            search_org_ccorg = 'hdqt_ccorg_cd';
        }else if(org_col_nm === 'hdqt_id' || org_col_nm === 'team_id'){
            search_org = 'team_id';
            search_org_nm = 'team_name';
            search_org_ccorg = 'team_ccorg_cd';
        }else{return;};

        const org_query = await SELECT.from(org_full_level).columns([search_org, search_org_nm, search_org_ccorg, 'org_order']).where({ [org_col_nm]: org_id }).orderBy('org_order');
        
        //조직 리스트
        let org_list = [];
        org_query.forEach(data=>{
            if(org_col_nm === 'hdqt_id' || org_col_nm === 'team_id'){
                if(org_id === data['org_id']){
                    let oTemp = {
                        id : data['org_id'],
                        name : data['org_name'],
                        ccorg : data['org_ccorg_cd'],
                        org_order : data['org_order']
                    };
                    org_list.push(oTemp);
                };
            }else{
                if(!org_list.find(data2=>data2.id === data[search_org]) && data[search_org]){
                    let oTemp = {
                        id : data[search_org],
                        name : data[search_org_nm],
                        ccorg : data[search_org_ccorg],
                        org_order : data['org_order']
                    };
                    org_list.push(oTemp);
                };
            }
        });

        let pl_column = org_col_nm === 'div_id' ? [...pl_col_list,'hdqt_id as id','hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_col_list,'team_id as id','team_name as name'] : [...pl_col_list,'div_id as id','div_name as name'];
        let pl_where = org_col_nm === 'div_id' ? {...pl_where_conditions,'hdqt_id':{'!=':null},and:{[org_col_nm]: org_id}} : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? {...pl_where_conditions,'team_id':{'!=':null},and:{[org_col_nm]: org_id}} : {...pl_where_conditions,'div_id':{'!=':null},and:{[org_col_nm]: org_id}};
        let pl_groupBy = org_col_nm === 'div_id' ? [...pl_groupBy_cols,'hdqt_id','hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_groupBy_cols,'team_id','team_name'] : [...pl_groupBy_cols,'div_id','div_name'];

        // DB 쿼리 실행 (병렬)
        const [pl_data] = await Promise.all([
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy)
        ]);

        let i_count = 0;
        let o_data = {}
        let o_total = {
            sale_true: {"display_order": i_count,"org_nm": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계',"relsco_type": "대내","type": "매출"},
            margin_true: {"display_order": ++i_count,"org_nm": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계',"relsco_type": "대내","type": "마진"},
            margin_rate_true: {"display_order": ++i_count,"org_nm": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계',"relsco_type": "대내","type": "마진률"},
            sale_false: {"display_order": ++i_count,"org_nm": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계',"relsco_type": "대외","type": "매출"},
            margin_false: {"display_order": ++i_count,"org_nm": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계',"relsco_type": "대외","type": "마진"},
            margin_rate_false: {"display_order": ++i_count,"org_nm": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계',"relsco_type": "대외","type": "마진률"},
        }; 
        pl_data.forEach(o_pl=>{
            if(!o_data[`${o_pl.id}`]){
                o_data[`${o_pl.id}`]={id:o_pl.id, name:o_pl.name}
            }
            if(o_pl.year === year){
                if(o_pl.relsco_yn){
                    o_data[`${o_pl.id}`]['curr_true_sale'] = o_pl.sale_amount_sum
                    o_data[`${o_pl.id}`]['curr_true_margin'] = o_pl.margin_amount_sum
                }else{
                    o_data[`${o_pl.id}`]['curr_false_sale'] = o_pl.sale_amount_sum
                    o_data[`${o_pl.id}`]['curr_false_margin'] = o_pl.margin_amount_sum
                }
            }else{
                if(o_pl.relsco_yn){
                    o_data[`${o_pl.id}`]['last_true_sale'] = o_pl.sale_amount_sum
                    o_data[`${o_pl.id}`]['last_true_margin'] = o_pl.margin_amount_sum
                }else{
                    o_data[`${o_pl.id}`]['last_false_sale'] = o_pl.sale_amount_sum
                    o_data[`${o_pl.id}`]['last_false_margin'] = o_pl.margin_amount_sum
                }
            }
        })
        
        let a_pl_data = Object.values(o_data);
        org_list.forEach((data)=>{
            let sale_true_data =
            {
                "display_order": ++i_count,
                "org_id": data.id,
                "org_nm": data.name,
                "relsco_type": "대내",
                "type": "매출",
                "actual_curr_ym_value": 0,
                "actual_last_ym_value": 0,
            };
            let margin_true_data =
            {
                "display_order": ++i_count,
                "org_id": data.id,
                "org_nm": data.name,
                "relsco_type": "대내",
                "type": "마진",
                "actual_curr_ym_value": 0,
                "actual_last_ym_value": 0,
            };
            let margin_rate_true_data =
            {
                "display_order": ++i_count,
                "org_id": data.id,
                "org_nm": data.name,
                "relsco_type": "대내",
                "type": "마진률",
                "actual_curr_ym_value": 0,
                "actual_last_ym_value": 0,
            };
            let sale_false_data =
            {
                "display_order": ++i_count,
                "org_id": data.id,
                "org_nm": data.name,
                "relsco_type": "대외",
                "type": "매출",
                "actual_curr_ym_value": 0,
                "actual_last_ym_value": 0,
            };
            let margin_false_data =
            {
                "display_order": ++i_count,
                "org_id": data.id,
                "org_nm": data.name,
                "relsco_type": "대외",
                "type": "마진",
                "actual_curr_ym_value": 0,
                "actual_last_ym_value": 0,
            };
            let margin_rate_false_data =
            {
                "display_order": ++i_count,
                "org_id": data.id,
                "org_nm": data.name,
                "relsco_type": "대외",
                "type": "마진률",
                "actual_curr_ym_value": 0,
                "actual_last_ym_value": 0,
            };
            a_pl_data.forEach((o_pl_data,i)=>{
                if(data.id === o_pl_data.id){
                    sale_true_data["actual_curr_ym_value"] = o_pl_data?.["curr_true_sale"] ?? 0;
                    sale_true_data["actual_last_ym_value"] = o_pl_data?.["last_true_sale"] ?? 0;
                    margin_true_data["actual_curr_ym_value"] = o_pl_data?.["curr_true_margin"] ?? 0;
                    margin_true_data["actual_last_ym_value"] = o_pl_data?.["last_true_margin"] ?? 0;
                    margin_rate_true_data["actual_curr_ym_value"] = (o_pl_data?.["curr_true_sale"] ?? 0) === 0 ? 0 : (o_pl_data?.["curr_true_margin"] ?? 0)/o_pl_data["curr_true_sale"];
                    margin_rate_true_data["actual_last_ym_value"] = (o_pl_data?.["last_true_sale"] ?? 0) === 0 ? 0 : (o_pl_data?.["last_true_margin"] ?? 0)/o_pl_data["last_true_sale"];
                    sale_false_data["actual_curr_ym_value"] = o_pl_data?.["curr_false_sale"] ?? 0;
                    sale_false_data["actual_last_ym_value"] = o_pl_data?.["last_false_sale"] ?? 0;
                    margin_false_data["actual_curr_ym_value"] = o_pl_data?.["curr_false_margin"] ?? 0;
                    margin_false_data["actual_last_ym_value"] = o_pl_data?.["last_false_margin"] ?? 0;
                    margin_rate_false_data["actual_curr_ym_value"] = (o_pl_data?.["curr_false_sale"] ?? 0) === 0 ? 0 : (o_pl_data?.["curr_false_margin"] ?? 0)/o_pl_data["curr_false_sale"];
                    margin_rate_false_data["actual_last_ym_value"] = (o_pl_data?.["last_false_sale"] ?? 0) === 0 ? 0 : (o_pl_data?.["last_false_margin"] ?? 0)/o_pl_data["last_false_sale"];
                   
                    o_total['sale_true']['actual_curr_ym_value'] = (o_total['sale_true']['actual_curr_ym_value'] || 0 ) + (o_pl_data?.["curr_true_sale"] ?? 0)
                    o_total['sale_true']['actual_last_ym_value'] = (o_total['sale_true']['actual_last_ym_value'] || 0 ) + (o_pl_data?.["last_true_sale"] ?? 0)
                    o_total['margin_true']['actual_curr_ym_value'] = (o_total['margin_true']['actual_curr_ym_value'] || 0 ) + (o_pl_data?.["curr_true_margin"] ?? 0)
                    o_total['margin_true']['actual_last_ym_value'] = (o_total['margin_true']['actual_last_ym_value'] || 0 ) + (o_pl_data?.["last_true_margin"] ?? 0)
                    o_total['sale_false']['actual_curr_ym_value'] = (o_total['sale_false']['actual_curr_ym_value'] || 0 ) + (o_pl_data?.["curr_false_sale"] ?? 0)
                    o_total['sale_false']['actual_last_ym_value'] = (o_total['sale_false']['actual_last_ym_value'] || 0 ) + (o_pl_data?.["last_false_sale"] ?? 0)
                    o_total['margin_false']['actual_curr_ym_value'] = (o_total['margin_false']['actual_curr_ym_value'] || 0 ) + (o_pl_data?.["curr_false_margin"] ?? 0)
                    o_total['margin_false']['actual_last_ym_value'] = (o_total['margin_false']['actual_last_ym_value'] || 0 ) + (o_pl_data?.["last_false_margin"] ?? 0)
                    oResult.push(sale_true_data,margin_true_data,margin_rate_true_data,sale_false_data,margin_false_data,margin_rate_false_data);
                };
            });    
        });
       
        o_total['margin_rate_true']['actual_curr_ym_value'] = (o_total['sale_true']?.['actual_curr_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin_true']?.['actual_curr_ym_value'] ?? 0)/o_total['sale_true']['actual_curr_ym_value'];
        o_total['margin_rate_true']['actual_last_ym_value'] = (o_total['sale_true']?.['actual_last_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin_true']?.['actual_last_ym_value'] ?? 0)/o_total['sale_true']['actual_last_ym_value'];
        o_total['margin_rate_false']['actual_curr_ym_value'] = (o_total['sale_false']?.['actual_curr_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin_false']?.['actual_curr_ym_value'] ?? 0)/o_total['sale_false']['actual_curr_ym_value'];
        o_total['margin_rate_false']['actual_last_ym_value'] = (o_total['sale_false']?.['actual_last_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin_false']?.['actual_last_ym_value'] ?? 0)/o_total['sale_false']['actual_last_ym_value'];
        
        let a_total_data = Object.values(o_total);
        a_total_data.forEach((o_total)=>{
            o_total["actual_curr_ym_value"] = o_total?.actual_curr_ym_value ?? 0;
            o_total["actual_last_ym_value"] = o_total?.actual_last_ym_value ?? 0;
        });
        oResult.unshift(...a_total_data);

        return oResult;
    });
}