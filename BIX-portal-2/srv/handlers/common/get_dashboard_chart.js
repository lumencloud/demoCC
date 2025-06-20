module.exports = (srv) => {
    srv.on('get_dashboard_chart', async (req) => {
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
        const pl_view = db.entities('pl').wideview_view;

        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;

        //목표값
        const target_view = db.entities('common').org_target_sum_view;
        // =================================================================================

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

        let i_month = Number(month);
        let sale_sum_col, margin_sum_col;
        let add_column=[];
        for(let i = 1 ; i <= i_month; i++){
            if(!sale_sum_col){
                sale_sum_col = `sum(ifnull(sale_m${i}_amt,0))`
                margin_sum_col = `sum(ifnull(margin_m${i}_amt,0))`
            }else{
                sale_sum_col += ` + sum(ifnull(sale_m${i}_amt,0))`
                margin_sum_col += ` + sum(ifnull(margin_m${i}_amt,0))`
            };
            add_column.push(`sum(ifnull(rodr_m${i}_amt,0)) as m_${i}_rodr_data`);
            add_column.push(`sum(case when ifnull(rodr_m${i}_amt,0) = 0 then 0 else 1 end) as m_${i}_rodr_cnt`);
        };
        sale_sum_col += ` as sale_amount_sum`;
        margin_sum_col += ` as margin_amount_sum`;

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
        let search_org, search_org_nm, target_where;
        const pl_col_list = ['year', 'org_order', sale_sum_col, margin_sum_col, ...add_column];
        const target_col = ['org_id', 'target_year', 'org_name', 'target_sale_amt', 'target_margin_rate'];

        if(org_col_nm === 'lv1_id'){
            search_org = 'div_id';
            search_org_nm = 'div_name';
            let aAddList = [search_org, search_org_nm];
            pl_col_list.push(...aAddList);
            target_where = {'total' : true, 'target_year': { in: [year, last_year] }};
        }else if(org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id'){
            search_org = 'div_id';
            search_org_nm = 'div_name';
            let aAddList = [search_org, search_org_nm];
            pl_col_list.push(...aAddList);
            target_where =  {'total' : false, 'target_year': { in: [year, last_year] }, [org_ccorg_col] : org_ccorg, 'div_ccorg_cd' : {'!=':null}, 'hdqt_ccorg_cd' : null };
        }else if(org_col_nm === 'div_id'){
            search_org = 'hdqt_id';
            search_org_nm = 'hdqt_name';
            let aAddList = [search_org, search_org_nm];
            pl_col_list.push(...aAddList);
            target_where =  {'total' : false, 'target_year': { in: [year, last_year] }, 'org_ccorg_cd' : org_ccorg };
        }else if(org_col_nm === 'hdqt_id'){
            search_org = 'team_id';
            search_org_nm = 'team_name';
            let aAddList = [search_org, search_org_nm];
            pl_col_list.push(...aAddList);
            target_where =  {'total' : false, 'target_year': { in: [year, last_year] }, 'org_ccorg_cd' : org_ccorg };
        }else{return;};

        /**
         * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const pl_where_conditions = { 'year': { in: [year, last_year] } };
        let pl_where =  org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
        const pl_groupBy_cols = ['year', 'org_order', search_org, search_org_nm];

        // DB 쿼리 실행 (병렬)
        const [pl_data, target_data] = await Promise.all([
            SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols).orderBy('org_order'),
            SELECT.from(target_view).columns(target_col).where(target_where)
        ]);

        let pl_sum_data = {
            "sale_curr_y_target": 0,//금년 매출 목표
            "sale_curr_ym_amt": 0,//금년 1~마감월 매출
            "sale_last_ym_amt": 0,//작년 1~마감월 매출
            "sale_curr_ym_rate": 0, // 금년 1~마감월 매출합산 / 금년목표 *100
            "sale_last_ym_rate": 0, // (금년 1~마감월 매출합산 - 작년 1~마감월 매출합산) / 작년 1~마감월 매출합산 *100
            "margin_curr_y_target": 0,//금년 마진 목표
            "margin_curr_ym_amt": 0,//금년 1~마감월 마진
            "margin_last_ym_amt": 0,//작년 1~마감월 마진
            "margin_curr_ym_rate": 0, // 금년 1~마감월 마진합산 / 금년목표 *100
            "margin_last_ym_rate": 0, // (금년 1~마감월 마진합산 - 작년 1~마감월 마진합산) / 작년 1~마감월 마진합산 *100
            "marginrate_curr_y_target": 0,//금년 마진률 목표
            "marginrate_curr_ym_amt": 0,//금년 1~마감월 마진률
            "marginrate_last_ym_amt": 0,//작년 1~마감월 마진률
            "marginrate_curr_ym_rate": 0, // ((금년 1~마감월 마진합산) / (금년 1~마감월 매출합산)) / 금년목표마진률 *100
            "marginrate_last_ym_rate": 0, // (((금년 1~마감월 마진합산) / (금년 1~마감월 매출합산)) - ((작년 1~마감월 마진합산) / (작년 1~마감월 매출합산))) / ((작년 1~마감월 마진합산) / (작년 1~마감월 매출합산)) *100
            "rodr_curr_ym_amt": 0, //금년 1~마감월 수주액
            "rodr_curr_ym_cnt": 0, //금년 1~마감월 수주건수
            "rodr_last_ym_amt": 0, //작년 1~마감월 수주액
            "rodr_last_ym_cnt": 0, //작년 1~마감월 수주건수
            "rodr_curr_ym_amt_rate": 0, // 금년 1~마감월 수주액 / 작년 1~마감월 수주액 * 100
            "rodr_curr_ym_cnt_rate": 0, // (금년 1~마감월 수주건수 - 작년 1~마감월 수주건수) / 작년 1~마감월 수주건수 * 100
        };

        if(org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id'){
            target_data.forEach(data=>{
                if(data.target_year === year){
                    pl_sum_data.sale_curr_y_target += Number(data?.target_sale_amt ?? 0) * 100000000;
                };
            });
        }else{
            if(target_data[0].target_year === year){
                pl_sum_data.sale_curr_y_target += (target_data?.[0]?.target_sale_amt ?? 0) * 100000000;
                pl_sum_data.margin_curr_y_target += ((target_data?.[0]?.target_margin_rate ?? 0) * (target_data?.[0]?.target_sale_amt ?? 0) / 100) * 100000000;
                pl_sum_data.marginrate_curr_y_target += (target_data?.[0]?.target_margin_rate ?? 0) * 100000000;
            };
        };

        pl_data.forEach(o_pl=>{
            if(o_pl.year === year){
                pl_sum_data['sale_curr_ym_amt'] += o_pl?.sale_amount_sum ?? 0;
                pl_sum_data['margin_curr_ym_amt'] += o_pl?.margin_amount_sum ?? 0;
                for(let i = 1 ; i <= i_month; i++){
                    pl_sum_data['rodr_curr_ym_amt'] += o_pl?.[`m_${i}_rodr_data`] ?? 0;
                    pl_sum_data['rodr_curr_ym_cnt'] += o_pl?.[`m_${i}_rodr_cnt`] ?? 0;
                };
            }else if(o_pl.year === last_year){
                pl_sum_data['sale_last_ym_amt'] += o_pl?.sale_amount_sum ?? 0;
                pl_sum_data['margin_last_ym_amt'] += o_pl?.margin_amount_sum ?? 0;
                for(let i = 1 ; i <= i_month; i++){
                    pl_sum_data['rodr_last_ym_amt'] += o_pl?.[`m_${i}_rodr_data`] ?? 0;
                    pl_sum_data['rodr_last_ym_cnt'] += o_pl?.[`m_${i}_rodr_cnt`] ?? 0;
                };
            };
        });

        pl_sum_data.sale_curr_ym_rate = pl_sum_data.sale_curr_y_target === 0 ? 0 : pl_sum_data.sale_curr_ym_amt / pl_sum_data.sale_curr_y_target * 100;
        pl_sum_data.sale_last_ym_rate = pl_sum_data.sale_last_ym_amt === 0 ? 0 : (pl_sum_data.sale_curr_ym_amt - pl_sum_data.sale_last_ym_amt) / pl_sum_data.sale_last_ym_amt * 100;
        pl_sum_data.margin_curr_ym_rate = pl_sum_data.margin_curr_y_target === 0 ? 0 : pl_sum_data.margin_curr_ym_amt / pl_sum_data.margin_curr_y_target * 100;
        pl_sum_data.margin_last_ym_rate = pl_sum_data.margin_last_ym_amt === 0 ? 0 : (pl_sum_data.margin_curr_ym_amt - pl_sum_data.margin_last_ym_amt) / pl_sum_data.margin_last_ym_amt * 100;
        pl_sum_data.marginrate_curr_ym_amt = pl_sum_data.sale_curr_ym_amt === 0 ? 0 : pl_sum_data.margin_curr_ym_amt / pl_sum_data.sale_curr_ym_amt * 100;
        pl_sum_data.marginrate_last_ym_amt = pl_sum_data.sale_last_ym_amt === 0 ? 0 : pl_sum_data.margin_last_ym_amt / pl_sum_data.sale_last_ym_amt * 100;
        pl_sum_data.marginrate_curr_ym_rate = pl_sum_data.marginrate_curr_y_target === 0 ? 0 : pl_sum_data.marginrate_curr_ym_amt / pl_sum_data.marginrate_curr_y_target * 100;
        pl_sum_data.marginrate_last_ym_rate = pl_sum_data.marginrate_last_ym_amt === 0 ? 0 : (pl_sum_data.marginrate_curr_ym_amt - pl_sum_data.marginrate_last_ym_amt) / pl_sum_data.marginrate_last_ym_amt * 100;
        pl_sum_data.rodr_curr_ym_amt_rate = pl_sum_data.rodr_last_ym_amt === 0 ? 0 : pl_sum_data.rodr_curr_ym_amt / pl_sum_data.rodr_last_ym_amt * 100;
        pl_sum_data.rodr_curr_ym_cnt_rate = pl_sum_data.rodr_last_ym_cnt === 0 ? 0 : (pl_sum_data.rodr_curr_ym_cnt - pl_sum_data.rodr_last_ym_cnt) / pl_sum_data.rodr_last_ym_cnt * 100;

    return pl_sum_data;
    });
}