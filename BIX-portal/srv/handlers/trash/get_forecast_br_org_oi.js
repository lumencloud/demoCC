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
         * rsp_org_mm [계획 인건비]
         */
        const rsp_org_mm = db.entities('rsp').org_mm;
        /**
         * common_org_full_level_view [조직정보]
         */
        const org_full_level = db.entities('common').org_full_level_view;
        // =================================================================================

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

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

        // DB 쿼리 실행 (병렬)
        const [a_org_full, orgInfo] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(org_full_level)
                .where`lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id}`,
            SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd'])
                .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`
        ]);

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        // 조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        let search_org, search_org_name;
        if (org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id') {
            search_org = 'div_id';
            search_org_name = 'div_name';
        } else if (org_col_nm === 'div_id') {
            search_org = 'hdqt_id';
            search_org_name = 'hdqt_name';
        } else if (org_col_nm === 'hdqt_id') {
            search_org = 'team_id';
            search_org_name = 'team_name';
        };

        // 파라미터로 받은 조직의 하위 ccorg_cd 배열
        let a_ccorg_cd = a_org_full.map(oData => oData.org_ccorg_cd);

        // DB 쿼리 실행 (병렬)
        const [query] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(rsp_org_mm)
                .columns(['ccorg_cd', ])
                .where({'ccorg_cd' : {in : a_ccorg_cd }})
        ]);

        return;


        let i_count = 0;
        org_key.forEach(data => {
            let oTemp = {
                display_order: ++i_count,
                org_name: data.name,
                org_id: data.id,
                type1: "신규",
                type2: "매출",
                forecast_value: pl_crovfalse_curr_y_row?.[data.id]?.['sale_amount_sum'] ?? 0,
                secured_value: secured_pl_crovfalse_curr_y_row?.[data.id]?.["sale_amount_sum"] ?? 0,
                not_secured_value: not_secured_pl_crovfalse_curr_y_row?.[data.id]?.["sale_amount_sum"] ?? 0,
                plan_ratio: (pl_crovfalse_curr_y_row?.[data.id]?.['sale_amount_sum'] ?? 0) !== 0 ? (secured_pl_crovfalse_curr_y_row?.[data.id]?.["sale_amount_sum"] ?? 0) / pl_crovfalse_curr_y_row[data.id]['sale_amount_sum'] * 100 : 0,
                yoy: (pl_crovfalse_curr_y_row?.[data.id]?.['sale_amount_sum'] ?? 0) !== 0 ? (pl_crovfalse_last_y_row?.[data.id]?.['sale_amount_sum'] ?? 0) / pl_crovfalse_curr_y_row[data.id]['sale_amount_sum'] * 100 : 0
            };
            oResult.push(oTemp);

            oTemp = {
                display_order: ++i_count,
                org_name: data.name,
                org_id: data.id,
                type1: "신규",
                type2: "마진",
                forecast_value: pl_crovfalse_curr_y_row?.[data.id]?.['margin_amount_sum'] ?? 0,
                secured_value: secured_pl_crovfalse_curr_y_row?.[data.id]?.["margin_amount_sum"] ?? 0,
                not_secured_value: not_secured_pl_crovfalse_curr_y_row?.[data.id]?.["margin_amount_sum"] ?? 0,
                plan_ratio: (pl_crovfalse_curr_y_row?.[data.id]?.['margin_amount_sum'] ?? 0) !== 0 ? (secured_pl_crovfalse_curr_y_row?.[data.id]?.["margin_amount_sum"] ?? 0) / pl_crovfalse_curr_y_row[data.id]['margin_amount_sum'] * 100 : 0,
                yoy: (pl_crovfalse_curr_y_row?.[data.id]?.['margin_amount_sum'] ?? 0) !== 0 ? (pl_crovfalse_last_y_row?.[data.id]?.['margin_amount_sum'] ?? 0) / pl_crovfalse_curr_y_row[data.id]['margin_amount_sum'] * 100 : 0
            };
            oResult.push(oTemp);

            oTemp = {
                display_order: ++i_count,
                org_name: data.name,
                org_id: data.id,
                type1: "이월",
                type2: "매출",
                forecast_value: pl_crovtrue_curr_y_row?.[data.id]?.['sale_amount_sum'] ?? 0,
                secured_value: secured_pl_crovtrue_curr_y_row?.[data.id]?.["sale_amount_sum"] ?? 0,
                not_secured_value: not_secured_pl_crovtrue_curr_y_row?.[data.id]?.["sale_amount_sum"] ?? 0,
                plan_ratio: (pl_crovtrue_curr_y_row?.[data.id]?.['sale_amount_sum'] ?? 0) !== 0 ? (secured_pl_crovtrue_curr_y_row?.[data.id]?.["sale_amount_sum"] ?? 0) / pl_crovtrue_curr_y_row[data.id]['sale_amount_sum'] * 100 : 0,
                yoy: (pl_crovtrue_curr_y_row?.[data.id]?.['sale_amount_sum'] ?? 0) !== 0 ? (pl_crovtrue_last_y_row?.[data.id]?.['sale_amount_sum'] ?? 0) / pl_crovtrue_curr_y_row[data.id]['sale_amount_sum'] * 100 : 0
            };
            oResult.push(oTemp);

            oTemp = {
                display_order: ++i_count,
                org_name: data.name,
                org_id: data.id,
                type1: "이월",
                type2: "마진",
                forecast_value: pl_crovtrue_curr_y_row?.[data.id]?.['margin_amount_sum'] ?? 0,
                secured_value: secured_pl_crovtrue_curr_y_row?.[data.id]?.["margin_amount_sum"] ?? 0,
                not_secured_value: not_secured_pl_crovtrue_curr_y_row?.[data.id]?.["margin_amount_sum"] ?? 0,
                plan_ratio: (pl_crovtrue_curr_y_row?.[data.id]?.['margin_amount_sum'] ?? 0) !== 0 ? (secured_pl_crovtrue_curr_y_row?.[data.id]?.["margin_amount_sum"] ?? 0) / pl_crovtrue_curr_y_row[data.id]['margin_amount_sum'] * 100 : 0,
                yoy: (pl_crovtrue_curr_y_row?.[data.id]?.['margin_amount_sum'] ?? 0) !== 0 ? (pl_crovtrue_last_y_row?.[data.id]?.['margin_amount_sum'] ?? 0) / pl_crovtrue_curr_y_row[data.id]['margin_amount_sum'] * 100 : 0
            };
            oResult.push(oTemp);
        });

        return oResult;
    });
};