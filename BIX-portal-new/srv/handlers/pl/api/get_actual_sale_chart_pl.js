module.exports = (srv) => {
    srv.on('get_actual_sale_chart_pl', async (req) => {

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

        let a_sale_column = [];
        let a_margin_column = [];
        for (let i = 1; i <= 12; i++) {
            if (i <= Number(month)) {
                a_sale_column.push(`sum(ifnull(sale_m${i}_amt,0))`)
                a_margin_column.push(`sum(ifnull(margin_m${i}_amt,0))`)
            };
        };

        let sale_sum_col = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
        let margin_sum_col = "(" + a_margin_column.join(' + ') + ') as margin_amount_sum';

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
        let org_ccorg_col_nm = org_col_nm.slice(0, -2) + 'ccorg_cd'; // <>_id 에서 id 제거 후 <>_ccorg_cd 컬럼명 생성
        let org_ccorg_cd = orgInfo.org_ccorg_cd;

        const pl_col_list = ['year', 'crov_div_yn', 'relsco_yn', sale_sum_col, margin_sum_col];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { '!=': 'D' } };
        const pl_groupBy_cols = ['year', 'crov_div_yn', 'relsco_yn'];


        // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
        let pl_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...pl_col_list, 'hdqt_ccorg_cd as ccorg_cd', 'hdqt_name as name'] : [...pl_col_list, 'div_ccorg_cd as ccorg_cd', 'div_name as name']
        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id }
        let pl_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...pl_groupBy_cols, 'hdqt_ccorg_cd', 'hdqt_name'] : [...pl_groupBy_cols, 'div_ccorg_cd', 'div_name']


        const target_col_list = ['ifnull(target_margin_rate,0) as target_margin_rate'];
        const target_where_conditions = { 'target_year': year, [org_ccorg_col_nm]: org_ccorg_cd };

        let target_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...target_col_list, 'hdqt_ccorg_cd as ccorg_cd'] : [...target_col_list, 'div_ccorg_cd as ccorg_cd']
        let target_where = org_col_nm === 'hdqt_id' ? { ...target_where_conditions, total: false, team_ccorg_cd: null } : { ...target_where_conditions, total: false, div_ccorg_cd: { '!=': null }, hdqt_ccorg_cd: null, team_ccorg_cd: null };
        // let target_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? ['hdqt_ccorg_cd'] : ['div_ccorg_cd']


        let org_column = org_col_nm === 'div_id' ? ['hdqt_ccorg_cd as ccorg_cd', 'hdqt_name as name', 'org_order'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? ['team_ccorg_cd as ccorg_cd', 'team_name as name', 'org_order'] : ['div_ccorg_cd as ccorg_cd', 'div_name as name', 'org_order'];
        let org_where = org_col_nm === 'div_id' ? { 'hdqt_id': { '!=': null }, and: { [org_col_nm]: org_id } } : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? { 'team_id': { '!=': null }, and: { [org_col_nm]: org_id } } : { 'div_id': { '!=': null }, and: { [org_col_nm]: org_id } };
        let org_groupBy = org_col_nm === 'div_id' ? ['hdqt_ccorg_cd', 'hdqt_name', 'org_order'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? ['team_ccorg_cd', 'team_name', 'org_order'] : ['div_ccorg_cd', 'div_name', 'org_order'];

        const [query, target_query, org_data] = await Promise.all([
            // PL 실적, 목표 조회
            // SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols),
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(target_view).columns(target_column).where(target_where),
            SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy)
        ]);
        let curr_pl = query.filter(pl => pl.year === year),
            last_pl = query.filter(pl => pl.year === last_year)
        let o_result = {}
        
        org_data.forEach(org => {
            let o_target = target_query.find(target => target.ccorg_cd === org.ccorg_cd)
            let a_last_pl = last_pl.filter(o_pl => o_pl.ccorg_cd === org.ccorg_cd);
            let a_curr_pl = curr_pl.filter(o_pl => o_pl.ccorg_cd === org.ccorg_cd);

            let i_curr_sale = a_curr_pl.reduce((iSum, oData) => iSum += oData.sale_amount_sum, 0)
            let i_curr_margin = a_curr_pl.reduce((iSum, oData) => iSum += oData.margin_amount_sum, 0)
            let i_last_sale = a_last_pl.reduce((iSum, oData) => iSum += oData.sale_amount_sum, 0)
            let i_last_margin = a_last_pl.reduce((iSum, oData) => iSum += oData.margin_amount_sum, 0)
            //  신규/이월 데이터 추출
            let a_crov_t_pl = a_curr_pl.filter(pl => pl.crov_div_yn === true)
            let a_crov_f_pl = a_curr_pl.filter(pl => pl.crov_div_yn !== true)
            //  대내/대외 데이터 추출
            let a_relsco_t_pl = a_curr_pl.filter(pl => pl.relsco_yn === true)
            let a_relsco_f_pl = a_curr_pl.filter(pl => pl.relsco_yn !== true)

            let i_crov_t_sale = a_crov_t_pl.reduce((iSum, oData) => iSum += oData.sale_amount_sum, 0)  // 신규 매출
            let i_crov_t_margin = a_crov_t_pl.reduce((iSum, oData) => iSum += oData.margin_amount_sum, 0)                                                                                         //신규마진
            let i_crov_f_sale = a_crov_f_pl.reduce((iSum, oData) => iSum += oData.sale_amount_sum, 0)  // 이월 매출
            let i_crov_f_margin = a_crov_f_pl.reduce((iSum, oData) => iSum += oData.margin_amount_sum, 0)                                                         //이월마진
            let i_relsco_t_sale = a_relsco_t_pl.reduce((iSum, oData) => iSum += oData.sale_amount_sum, 0) // 대내 매출
            let i_relsco_t_margin = a_relsco_t_pl.reduce((iSum, oData) => iSum += oData.margin_amount_sum, 0)                                                                                           // 대내 마진
            let i_relsco_f_sale = a_relsco_f_pl.reduce((iSum, oData) => iSum += oData.sale_amount_sum, 0) // 대외 매출
            let i_relsco_f_margin = a_relsco_t_pl.reduce((iSum, oData) => iSum += oData.margin_amount_sum, 0)                                                                                      // 대외 마진

            o_result[`${org.ccorg_cd}`] = {
                org_ccorg_cd: org.ccorg_cd,
                org_name: org.name,
                target: o_target?.target_margin_rate ?? 0,     
                curr_sale: i_curr_sale,                        // 올해 매출
                curr_margin: i_curr_margin,                    // 올해 마진
                last_sale: i_last_sale,                        // 작년 매출
                last_margin: i_last_margin,                    // 작년 마진
                margin_rate: i_curr_sale === 0 ? 0 : i_curr_margin / i_curr_sale * 100,  //마진률
                crov_t_sale: i_crov_t_sale,                         // 신규 매출
                crot_t_margin_rate: i_crov_t_margin / i_crov_t_sale,     // 신규 마진율
                crov_f_sale: i_crov_f_sale,                         // 이월 매출
                crov_f_margin_rate: i_crov_f_margin / i_crov_f_sale,     // 이월 마진율
                relsco_t_sale: i_relsco_t_sale,                     // 대내 매출
                relsco_t_margin_rate: i_relsco_t_margin / i_relsco_t_sale, // 대내마진율
                relsco_f_sale: i_relsco_f_sale,                         // 대외 매출
                relsco_f_margin_rate: i_relsco_f_margin / i_relsco_f_sale, //대외마진율
                yoy_sale_rate: (i_curr_sale - i_last_sale) / i_last_sale ?? 0,   // 전년대비 매출 증감율
                yoy_margin_rate: (i_curr_margin - i_last_margin) / i_last_margin ?? 0   // 전년대비 마진 증감율
            }
        })

        let a_result = Object.values(o_result)
        oResult.push(...a_result)

        return oResult
    });
}