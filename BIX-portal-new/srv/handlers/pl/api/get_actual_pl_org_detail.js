const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_pl_org_detail', async (req) => {

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
         * pl_wideview_unpivot_view [실적]
         */
        const pl_view = db.entities('pl').wideview_unpivot_view;
        /**
         * sga_wideview_unpivot_view [sg&a 집계]
         */
        const sga_view = db.entities('sga').wideview_unpivot_view;
        /**
         * common_org_full_level_view [조직정보]
         */
        const org_full_level = db.entities('common').org_full_level_view;
        /**
         * rsp_wideview_unpivot_view [총비용]
         */
        const rsp_view = db.entities('rsp').wideview_unpivot_view;

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

        /** 
         * 타겟 뷰 조회용 컬럼
         */
        const target_col_list = [
            'year', 'sum(sale) as target_sale_amount',
            'sum(margin) as target_margin_amount', 'sum(br) as target_br'];
        const target_where_conditions = { 'year': { in: [year, last_year] } };
        const target_groupBy_cols = ['year']

        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const pl_col_list = [
            'year', 'month_amt', 'sum(sale_amount_sum) as sale_amount_sum', 'sum(prj_prfm_amount_sum) as prj_prfm_amount_sum', 'sum(ifnull(margin_amount_sum,0)) as margin_amount_sum'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month, 'src_type': { 'not in':['WA','D']} };
        const pl_groupBy_cols = ['year', 'month_amt'];
        
        /**
         * [TEMP]
         * SG&A 조회용 컬럼
         */
        const sga_col_list = ['year', 'month_amt',
            '(coalesce(sum(labor_amount_sum),0) + coalesce(sum(iv_amount_sum),0) + coalesce(sum(exp_amount_sum),0)) as amount_sum'];
        const sga_where_conditions = {'year': { in: [year, last_year] }, 'month_amt':month, 'shared_exp_yn': false};
        const sga_groupBy_cols = ['year', 'month_amt'];

        /**
         * [TEMP]
         * SG&A 조회용 컬럼
         */
        const rsp_col_list = ['year', 'month_amt', 'sum(ifnull(total_amt_sum,0)) as total_amt_sum', 'sum(ifnull(bill_amt_sum,0)) as bill_amt_sum'];
        const rsp_where_conditions = {'year' : { in: [year, last_year] }, 'month_amt': month, 'is_delivery': true};
        const rsp_groupBy_cols = ['year','month_amt'];

        /**
         * +++++ TBD +++++
         * 권한 체크하여 사용자가 조회 가능한 조직인지 판별 후 코드 진행
         */

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

        let target_column;
        let target_where;
        let target_groupBy;

        let pl_column;
        let pl_where;
        let pl_groupBy;

        let sga_column;
        let sga_where; 
        let sga_groupBy;

        let rsp_column;
        let rsp_where; 
        let rsp_groupBy;

        if (org_data?.length > 0) {
            let aOrgCode = [];
            org_data.forEach(data =>{
                if(data[`${org_chk}`]){
                    aOrgCode.push(data[`${org_chk}`]);
                };
            });

            pl_column = [...pl_col_list, `${org_chk}`];
            pl_where = {...pl_where_conditions, [`${org_chk}`]: [...aOrgCode]}
            pl_groupBy = [...pl_groupBy_cols, `${org_chk}`];

            target_column = [...target_col_list, `${org_chk}`];
            target_where = { ...target_where_conditions, [`${org_chk}`]: [...aOrgCode] };
            target_groupBy = [...target_groupBy_cols, `${org_chk}`];
            
            sga_column = [ ...sga_col_list, `${org_chk}`];
            sga_where = { ...sga_where_conditions, [`${org_chk}`]: [...aOrgCode]};
            sga_groupBy = [...sga_groupBy_cols, `${org_chk}`];

            rsp_column = [ ...rsp_col_list, `${org_chk}`];
            rsp_where = { ...rsp_where_conditions, [`${org_chk}`]: [...aOrgCode]};
            rsp_groupBy = [...rsp_groupBy_cols, `${org_chk}`];
        }else{
            return;
        };

        const [query, query_target, sga_query, rsp_query] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(pl_target_view).columns(target_column).where(target_where).groupBy(...target_groupBy),
            // SG&A 사업 실적데이터
            SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
            // rsp 데이터
            SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy)
        ]);

        //query 값 조직id 및 년 기준 flat으로 변환
        let flat_query = query.reduce((acc, item) =>{
            let main = item[org_chk];
            let sub = item['year'];
            let rest = {...item};
            delete rest[org_chk];
            delete rest['year'];
            Object.entries(rest).forEach(([key, value])=>{
                acc[`_${main}_${sub}${key}`] = value;
            });
            return acc;
        }, {});

        //query_target 값 조직id 및 년 기준 flat으로 변환
        let flat_query_target = query_target.reduce((acc, item) =>{
            let main = item[org_chk];
            let sub = item['year'];
            let rest = {...item};
            delete rest[org_chk];
            delete rest['year'];
            Object.entries(rest).forEach(([key, value])=>{
                acc[`_${main}_${sub}${key}`] = value;
            });
            return acc;
        }, {});

        //sga 값 조직id 및 년 기준 flat으로 변환
        let flat_sga = sga_query.reduce((acc, item) =>{
            let main = item[org_chk];
            let sub = item['year'];
            let rest = {...item};
            delete rest[org_chk];  
            delete rest['year'];
            Object.entries(rest).forEach(([key, value])=>{
                acc[`_${main}_${sub}${key}`] = value;
            });
            return acc;
        }, {});

        //rsp 값 조직id 및 년 기준 flat으로 변환
        let flat_rsp = rsp_query.reduce((acc, item) =>{
            let main = item[org_chk];
            let sub = item['year'];
            let rest = {...item};
            delete rest[org_chk];
            delete rest['year'];
            Object.entries(rest).forEach(([key, value])=>{
                acc[`_${main}_${sub}${key}`] = value;
            });
            return acc;
        }, {});

        // 데이터 구성
        let base_data =[];
        org_data.forEach(data =>{
            if(data[`${org_chk}`]){
                let id_value = data[`${org_chk}`];
                let name_value = id_value + '_name';
                let target_curr_y_key = id_value + '_target_curr_y_value';
                let actual_curr_ym_key = id_value + '_curr_ym_value';
                let actual_last_ym_key = id_value + '_last_ym_value';
                let actual_gap_key = id_value + '_gap';

                let actual_curr_ym_value = flat_query?.[`_`+id_value+`_`+year+`sale_amount_sum`] ?? 0;
                let actual_last_ym_value = flat_query?.[`_`+id_value+`_`+last_year+`sale_amount_sum`] ?? 0;
                let target_curr_y_value = flat_query_target?.[`_`+id_value+`_`+year+`target_sale_amount`] ?? 0;
                let oTemp = {
                    type : org_chk,
                    rowType : "performance",
                    seq : 0,
                    id : id_value,
                    [`${name_value}`] : data[`${org_chk.split('_',1)}`+`_name`],
                    [`${target_curr_y_key}`] : target_curr_y_value,
                    [`${actual_curr_ym_key}`] : actual_curr_ym_value,
                    [`${actual_last_ym_key}`] : actual_last_ym_value,
                    [`${actual_gap_key}`] : actual_curr_ym_value - actual_last_ym_value
                };
                base_data.push(oTemp);

                let margin_curr_ym_value = flat_query?.[`_`+id_value+`_`+year+`margin_amount_sum`] ?? 0;
                let margin_last_ym_value = flat_query?.[`_`+id_value+`_`+last_year+`margin_amount_sum`] ?? 0;
                let margin_target_curr_y_value = flat_query_target?.[`_`+id_value+`_`+year+`target_margin_amount`] ?? 0;
                oTemp = {
                    type : org_chk,
                    rowType : "margin",
                    seq : 1,
                    id : data[`${org_chk}`],
                    [`${name_value}`] : data[`${org_chk.split('_',1)}`+`_name`],
                    [`${target_curr_y_key}`] : margin_target_curr_y_value,
                    [`${actual_curr_ym_key}`] : margin_curr_ym_value,
                    [`${actual_last_ym_key}`] : margin_last_ym_value,
                    [`${actual_gap_key}`] : margin_curr_ym_value - margin_last_ym_value
                };
                base_data.push(oTemp);

                let margin_curr_ym_rate = !actual_curr_ym_value ? 0 : margin_curr_ym_value / actual_curr_ym_value * 100;
                let margin_last_ym_rate = !actual_last_ym_value ? 0 : margin_last_ym_value / actual_last_ym_value * 100;
                let margin_target_curr_y_rate = !target_curr_y_value ? 0 : margin_target_curr_y_value / target_curr_y_value * 100;
                oTemp = {
                    type : org_chk,
                    rowType : "marginRate",
                    seq : 2,
                    id : data[`${org_chk}`],
                    [`${name_value}`] : data[`${org_chk.split('_',1)}`+`_name`],
                    [`${target_curr_y_key}`] : margin_target_curr_y_rate,
                    [`${actual_curr_ym_key}`] : margin_curr_ym_rate,
                    [`${actual_last_ym_key}`] : margin_last_ym_rate,
                    [`${actual_gap_key}`] : margin_curr_ym_rate - margin_last_ym_rate
                };
                base_data.push(oTemp);
                
                let sga_curr_ym_value = flat_sga?.[`_`+id_value+`_`+year+`amount_sum`] ?? 0;
                let sga_last_ym_value = flat_sga?.[`_`+id_value+`_`+last_year+`amount_sum`] ?? 0;
                let sga_target_curr_ym_value = 0;
                oTemp = {
                    type : org_chk,
                    rowType : "sgaBiz",
                    seq : 3,
                    id : data[`${org_chk}`],
                    [`${name_value}`] : data[`${org_chk.split('_',1)}`+`_name`],
                    [`${target_curr_y_key}`] : sga_target_curr_ym_value,
                    [`${actual_curr_ym_key}`] : sga_curr_ym_value,
                    [`${actual_last_ym_key}`] : sga_last_ym_value,
                    [`${actual_gap_key}`] : sga_curr_ym_value - sga_last_ym_value
                };
                base_data.push(oTemp);

                oTemp = {
                    type : org_chk,
                    rowType : "contributionValue",
                    seq : 4,
                    id : data[`${org_chk}`],
                    [`${name_value}`] : data[`${org_chk.split('_',1)}`+`_name`],
                    [`${target_curr_y_key}`] : margin_target_curr_y_value - sga_target_curr_ym_value,
                    [`${actual_curr_ym_key}`] : margin_curr_ym_value - sga_curr_ym_value,
                    [`${actual_last_ym_key}`] : margin_last_ym_value - sga_last_ym_value,
                    [`${actual_gap_key}`] : (margin_curr_ym_value - margin_last_ym_value) - (sga_curr_ym_value - sga_last_ym_value)
                };
                base_data.push(oTemp);

                let br_target_curr_ym_value = flat_query_target?.[`_`+id_value+`_`+year+`target_br`] ?? 0;
                let br_curr_ym_value = (flat_rsp?.[`_`+id_value+`_`+year+`total_amt_sum`] ?? 0) !== 0 ? ((flat_rsp?.[`_`+id_value+`_`+year+`bill_amt_sum`] ?? 0) / (flat_rsp[`_`+id_value+`_`+year+`total_amt_sum`])) * 100 : 0;
                let br_last_ym_value = (flat_rsp?.[`_`+id_value+`_`+last_year+`total_amt_sum`] ?? 0)  !== 0 ? ((flat_rsp?.[`_`+id_value+`_`+last_year+`bill_amt_sum`] ?? 0) / (flat_rsp[`_`+id_value+`_`+last_year+`total_amt_sum`])) * 100 : 0;
                oTemp = {
                    type : org_chk,
                    rowType : "br",
                    seq : 8,
                    id : data[`${org_chk}`],
                    [`${name_value}`] : data[`${org_chk.split('_',1)}`+`_name`],
                    [`${target_curr_y_key}`] : br_target_curr_ym_value,
                    [`${actual_curr_ym_key}`] : br_curr_ym_value,
                    [`${actual_last_ym_key}`] : br_last_ym_value,
                    [`${actual_gap_key}`] : br_curr_ym_value - br_last_ym_value
                };
                base_data.push(oTemp);

                let rohc_curr_ym_value = (flat_rsp?.[`_`+id_value+`_`+year+`total_amt_sum`] ?? 0) !== 0 ? (margin_curr_ym_value - sga_curr_ym_value) / flat_rsp[`_`+id_value+`_`+year+`total_amt_sum`] : 0;
                let rohc_last_ym_value = (flat_rsp?.[`_`+id_value+`_`+last_year+`total_amt_sum`] ?? 0) !== 0 ? (margin_last_ym_value - sga_last_ym_value) / flat_rsp[`_`+id_value+`_`+last_year+`total_amt_sum`] : 0;
                oTemp = {
                    type : org_chk,
                    rowType : "rohc",
                    seq : 9,
                    id : data[`${org_chk}`],
                    [`${name_value}`] : data[`${org_chk.split('_',1)}`+`_name`],
                    [`${target_curr_y_key}`] : 0,
                    [`${actual_curr_ym_key}`] : rohc_curr_ym_value,
                    [`${actual_last_ym_key}`] : rohc_last_ym_value,
                    [`${actual_gap_key}`] : rohc_curr_ym_value - rohc_last_ym_value
                };
                base_data.push(oTemp);
            };
        });
        oResult.push(...base_data);

        return oResult;
    });
}