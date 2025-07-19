const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_plan_account_by_cstco', async (req) => {
        try {
            /**
             * 핸들러 초기에 권한체크
             */
            // await check_user_auth(req);

            /**
             * API 리턴값 담을 배열 선언
             */
            let a_result = [];

            // cds 모듈을 통한 DB 커넥트
            const db = await cds.connect.to('db');

            // =========================== 조회 대상 DB 테이블 ===========================
            // entities('<cds namespace 명>').<cds entity 명>
            // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
            // (서비스에 등록할 필요는 없음)
            /**
             * BR [실적]
             */
            const pl_pipeline_view = db.entities('pl').pipeline_view;

            const customer_view = db.entities("common").customer;

            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;

            // function 입력 파라미터
            const { year, month, org_id, account_cd, type } = req.data;

            /**
             * org_id 파라미터값으로 조직정보 조회 및 버전 확인
             */
            const org_col = `case
                when lv1_id = '${org_id}' THEN 'lv1_ccorg_cd'
                when lv2_id = '${org_id}' THEN 'lv2_ccorg_cd'
                when lv3_id = '${org_id}' THEN 'lv3_ccorg_cd'
                when div_id = '${org_id}' THEN 'div_ccorg_cd'
                when hdqt_id = '${org_id}' THEN 'hdqt_ccorg_cd'
                when team_id = '${org_id}' THEN 'team_ccorg_cd'
                end as org_level`;
            const [orgInfo] = await Promise.all([
                SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', 'org_name']).where({ 'org_id': org_id }),
            ]);

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            let a_not_secured_data = ['Lead', 'Identified', 'Validated', 'Qualified', 'Negotiated']

            // 월 기준
            if (type === "month") {
                let sale_column = ['cstco_cd'], rodr_column = ['cstco_cd'], count_column = ['cstco_cd'];
                let a_sale = [], a_rodr = [], a_count = [];
                for (let i = Number(month) + 1; i <= 12; i++) {
                    // 매출, 수주, 건수
                    sale_column.push(`sum(sale_m${i}_amt) as m_${i}_data`);
                    rodr_column.push(`sum(rodr_m${i}_amt) as m_${i}_data`);
                    count_column.push(`sum(case when rodr_m${i}_amt = 0 then 0 else 1 end) as m_${i}_data`);

                    // 합계
                    a_sale.push(`sum(sale_m${i}_amt)`);
                    a_rodr.push(`sum(rodr_m${i}_amt)`);
                    a_count.push(`sum(case when rodr_m${i}_amt = 0 then 0 else 1 end)`);
                }

                // ai Report 용도
                sale_column.push(`'매출' as type`);
                rodr_column.push(`'수주' as type`);
                count_column.push(`'건수' as type`);

                // 합계 컬럼 추가
                let s_sale_total = a_sale.join(" + ");
                let s_rodr_total = a_rodr.join(" + ");
                let s_count_total = a_count.join(" + ");
                sale_column.push(`${s_sale_total} as total_data`);
                rodr_column.push(`${s_rodr_total} as total_data`);
                count_column.push(`${s_count_total} as total_data`);

                const pl_where = { 'year': year, [orgInfo.org_level]: orgInfo.org_ccorg_cd, biz_tp_account_cd: account_cd, weekly_yn: false, 'deal_stage_cd': { in: a_not_secured_data } };
                const pl_groupBy = ['cstco_cd'];

                // customer 설정
                const customer_column = ["code", "name"];

                // DB 쿼리 실행 (병렬)
                let [sale_data, rodr_data, count_data, customer_data] = await Promise.all([
                    SELECT.from(pl_pipeline_view).columns(sale_column).where(pl_where).groupBy(...pl_groupBy).orderBy("total_data desc"),
                    SELECT.from(pl_pipeline_view).columns(rodr_column).where(pl_where).groupBy(...pl_groupBy).orderBy("total_data desc"),
                    SELECT.from(pl_pipeline_view).columns(count_column).where(pl_where).groupBy(...pl_groupBy).orderBy("total_data desc"),
                    SELECT.from(customer_view).columns(customer_column),
                ]);
                if (!sale_data.length && !rodr_data.length && !count_data.length) {
                    //return req.res.status(204).send();
                    return []
                }

                // PL 데이터에 고객사 이름 붙이기
                sale_data.forEach(o_data => o_data["cstco_name"] = customer_data.find(o_customer_data => o_customer_data.code === o_data.cstco_cd)?.name);
                rodr_data.forEach(o_data => o_data["cstco_name"] = customer_data.find(o_customer_data => o_customer_data.code === o_data.cstco_cd)?.name);
                count_data.forEach(o_data => o_data["cstco_name"] = customer_data.find(o_customer_data => o_customer_data.code === o_data.cstco_cd)?.name);

                // 고객사명 없는 데이터 제거
                sale_data = sale_data.filter(o_data => !!o_data.cstco_name);
                rodr_data = rodr_data.filter(o_data => !!o_data.cstco_name);
                count_data = count_data.filter(o_data => !!o_data.cstco_name);

                // Total 기준으로 상위 5개의 항목만 반환
                sale_data = sale_data.sort((oItem1, oItem2) => oItem2.total_data - oItem1.total_data).slice(0, 5);
                rodr_data = rodr_data.sort((oItem1, oItem2) => oItem2.total_data - oItem1.total_data).slice(0, 5);
                count_data = count_data.sort((oItem1, oItem2) => oItem2.total_data - oItem1.total_data).slice(0, 5);

                a_result = [...sale_data, ...rodr_data, ...count_data];
            } else if (type === "deal") {   // Deal Stage

                let a_sale = [], a_rodr = [];
                for (let i = Number(month) + 1; i <= 12; i++) {
                    a_sale.push(`sale_m${i}_amt`);
                    a_rodr.push(`rodr_m${i}_amt`);
                }

                // 합계
                let s_sale_total = a_sale.join(" + ");
                let s_rodr_total = a_rodr.join(" + ");

                // 매출, 수주, 건수 컬럼
                const sale_column = ['cstco_cd',
                    `sum(case when deal_stage_cd = 'Lead' then ${s_sale_total} else 0 end) as lead_data`,
                    `sum(case when deal_stage_cd = 'Identified' then ${s_sale_total} else 0 end) as identified_data`,
                    `sum(case when deal_stage_cd = 'Validated' then ${s_sale_total} else 0 end) as validated_data`,
                    `sum(case when deal_stage_cd = 'Qualified' then ${s_sale_total} else 0 end) as qualified_data`,
                    `sum(case when deal_stage_cd = 'Negotiated' then ${s_sale_total} else 0 end) as negotiated_data`,
                    `sum(case when deal_stage_cd in ('Lead','Identified','Validated','Qualified','Negotiated')
                        then ${s_sale_total} else 0 end) as not_secured_total`,
                    `sum(case when deal_stage_cd is not null then ${s_sale_total} else 0 end) as total_data`,
                    `'매출' as type`,
                ];
                const rodr_column = ['cstco_cd',
                    `sum(case when deal_stage_cd = 'Lead' then ${s_rodr_total} else 0 end) as lead_data`,
                    `sum(case when deal_stage_cd = 'Identified' then ${s_rodr_total} else 0 end) as identified_data`,
                    `sum(case when deal_stage_cd = 'Validated' then ${s_rodr_total} else 0 end) as validated_data`,
                    `sum(case when deal_stage_cd = 'Qualified' then ${s_rodr_total} else 0 end) as qualified_data`,
                    `sum(case when deal_stage_cd = 'Negotiated' then ${s_rodr_total} else 0 end) as negotiated_data`,
                    `sum(case when deal_stage_cd in ('Lead','Identified','Validated','Qualified','Negotiated')
                        then ${s_rodr_total} else 0 end) as not_secured_total`,
                    `sum(case when deal_stage_cd is not null then ${s_rodr_total} else 0 end) as total_data`,
                    `'수주' as type`,
                ];

                const count_column = ['cstco_cd',
                    `sum(case when deal_stage_cd = 'Lead' and ${s_rodr_total} > 0 then 1 else 0 end) as lead_data`,
                    `sum(case when deal_stage_cd = 'Identified' and ${s_rodr_total} > 0 then 1 else 0 end) as identified_data`,
                    `sum(case when deal_stage_cd = 'Validated' and ${s_rodr_total} > 0 then 1 else 0 end) as validated_data`,
                    `sum(case when deal_stage_cd = 'Qualified' and ${s_rodr_total} > 0 then 1 else 0 end) as qualified_data`,
                    `sum(case when deal_stage_cd = 'Negotiated' and ${s_rodr_total} > 0 then 1 else 0 end) as negotiated_data`,
                    `sum(case when deal_stage_cd in ('Lead','Identified','Validated','Qualified','Negotiated') and ${s_rodr_total} > 0 then 1 else 0 end) as not_secured_total`,
                    `sum(case when deal_stage_cd is not null then 1 else 0 end) as total_data`,
                    `'건수' as type`,
                ];

                const pl_where = { 'year': year, [orgInfo.org_level]: orgInfo.org_ccorg_cd, biz_tp_account_cd: account_cd, weekly_yn: false, 'deal_stage_cd': { in: a_not_secured_data } };
                const pl_groupBy = ['cstco_cd'];

                // customer 설정
                const customer_column = ["code", "name"];

                // DB 쿼리 실행 (병렬)
                let [sale_data, rodr_data, count_data, customer_data] = await Promise.all([
                    SELECT.from(pl_pipeline_view).columns(sale_column).where(pl_where).groupBy(...pl_groupBy).orderBy("total_data desc"),
                    SELECT.from(pl_pipeline_view).columns(rodr_column).where(pl_where).groupBy(...pl_groupBy).orderBy("total_data desc"),
                    SELECT.from(pl_pipeline_view).columns(count_column).where(pl_where).groupBy(...pl_groupBy).orderBy("total_data desc"),
                    SELECT.from(customer_view).columns(customer_column),
                ]);
                if (!sale_data.length && !rodr_data.length && !count_data.length) {
                    //return req.res.status(204).send();
                    return []
                }

                // PL 데이터에 고객사 이름 붙이기
                sale_data.forEach(o_data => o_data["cstco_name"] = customer_data.find(o_customer_data => o_customer_data.code === o_data.cstco_cd)?.name);
                rodr_data.forEach(o_data => o_data["cstco_name"] = customer_data.find(o_customer_data => o_customer_data.code === o_data.cstco_cd)?.name);
                count_data.forEach(o_data => o_data["cstco_name"] = customer_data.find(o_customer_data => o_customer_data.code === o_data.cstco_cd)?.name);

                // 고객사명 없는 데이터 제거
                sale_data = sale_data.filter(o_data => !!o_data.cstco_name);
                rodr_data = rodr_data.filter(o_data => !!o_data.cstco_name);
                count_data = count_data.filter(o_data => !!o_data.cstco_name);

                // Total 기준으로 상위 5개의 항목만 
                sale_data = sale_data.sort((oItem1, oItem2) => oItem2.total_data - oItem1.total_data).slice(0, 5);
                rodr_data = rodr_data.sort((oItem1, oItem2) => oItem2.total_data - oItem1.total_data).slice(0, 5);
                count_data = count_data.sort((oItem1, oItem2) => oItem2.total_data - oItem1.total_data).slice(0, 5);

                a_result = [...sale_data, ...rodr_data, ...count_data];
            } else if (type === "rodr") {   // 수주 금액

                let a_sale = [], a_rodr = [];
                for (let i = Number(month) + 1; i <= 12; i++) {
                    a_sale.push(`sale_m${i}_amt`);
                    a_rodr.push(`rodr_m${i}_amt`);
                }

                // 합계
                let s_sale_total = a_sale.join(" + ");
                let s_rodr_total = a_rodr.join(" + ");

                const sale_column = ['cstco_cd',
                    `sum(${s_sale_total}) as total_data`,
                    `sum(case when ${s_rodr_total} <= 100000000 then ${s_sale_total} else 0 end) as amt1`,
                    `sum(case when ${s_rodr_total} > 100000000 and ${s_rodr_total} <= 500000000 then ${s_sale_total} else 0 end) as amt2`,
                    `sum(case when ${s_rodr_total} > 500000000 and ${s_rodr_total} <= 1000000000 then ${s_sale_total} else 0 end) as amt3`,
                    `sum(case when ${s_rodr_total} > 1000000000 and ${s_rodr_total} <= 3000000000 then ${s_sale_total} else 0 end) as amt4`,
                    `sum(case when ${s_rodr_total} > 3000000000 and ${s_rodr_total} <= 5000000000 then ${s_sale_total} else 0 end) as amt5`,
                    `sum(case when ${s_rodr_total} > 5000000000 and ${s_rodr_total} <= 10000000000 then ${s_sale_total} else 0 end) as amt6`,
                    `sum(case when ${s_rodr_total} > 10000000000 then ${s_sale_total} else 0 end) as amt7`,
                    `'매출' as type`,
                ];

                const rodr_column = ['cstco_cd',
                    `sum(${s_rodr_total}) as total_data`,
                    `sum(case when ${s_rodr_total} <= 100000000 then ${s_rodr_total} else 0 end) as amt1`,
                    `sum(case when ${s_rodr_total} > 100000000 and ${s_rodr_total} <= 500000000 then ${s_rodr_total} else 0 end) as amt2`,
                    `sum(case when ${s_rodr_total} > 500000000 and ${s_rodr_total} <= 1000000000 then ${s_rodr_total} else 0 end) as amt3`,
                    `sum(case when ${s_rodr_total} > 1000000000 and ${s_rodr_total} <= 3000000000 then ${s_rodr_total} else 0 end) as amt4`,
                    `sum(case when ${s_rodr_total} > 3000000000 and ${s_rodr_total} <= 5000000000 then ${s_rodr_total} else 0 end) as amt5`,
                    `sum(case when ${s_rodr_total} > 5000000000 and ${s_rodr_total} <= 10000000000 then ${s_rodr_total} else 0 end) as amt6`,
                    `sum(case when ${s_rodr_total} > 10000000000 then ${s_rodr_total} else 0 end) as amt7`,
                    `'수주' as type`,
                ];

                const count_column = ['cstco_cd',
                    `sum(case when ${s_rodr_total} > 0 then 1 else 0 end) as total_data`,
                    `sum(case when ${s_rodr_total} <= 100000000 then 1 else 0 end) as amt1`,
                    `sum(case when ${s_rodr_total} > 100000000 and ${s_rodr_total} <= 500000000 then 1 else 0 end) as amt2`,
                    `sum(case when ${s_rodr_total} > 500000000 and ${s_rodr_total} <= 1000000000 then 1 else 0 end) as amt3`,
                    `sum(case when ${s_rodr_total} > 1000000000 and ${s_rodr_total} <= 3000000000 then 1 else 0 end) as amt4`,
                    `sum(case when ${s_rodr_total} > 3000000000 and ${s_rodr_total} <= 5000000000 then 1 else 0 end) as amt5`,
                    `sum(case when ${s_rodr_total} > 5000000000 and ${s_rodr_total} <= 10000000000 then 1 else 0 end) as amt6`,
                    `sum(case when ${s_rodr_total} > 10000000000 then 1 else 0 end) as amt7`,
                    `'건수' as type`,
                ];

                const pl_where = { 'year': year, [orgInfo.org_level]: orgInfo.org_ccorg_cd, biz_tp_account_cd: account_cd, weekly_yn: false, 'deal_stage_cd': { in: a_not_secured_data } };
                const pl_groupBy = ['cstco_cd'];

                // customer 설정
                const customer_column = ["code", "name"];

                // DB 쿼리 실행 (병렬)
                let [sale_data, rodr_data, count_data, customer_data] = await Promise.all([
                    SELECT.from(pl_pipeline_view).columns(sale_column).where(pl_where).groupBy(...pl_groupBy).orderBy("total_data desc"),
                    SELECT.from(pl_pipeline_view).columns(rodr_column).where(pl_where).groupBy(...pl_groupBy).orderBy("total_data desc"),
                    SELECT.from(pl_pipeline_view).columns(count_column).where(pl_where).groupBy(...pl_groupBy).orderBy("total_data desc"),
                    SELECT.from(customer_view).columns(customer_column),
                ]);
                if (!sale_data.length && !rodr_data.length && !count_data.length) {
                    //return req.res.status(204).send();
                    return []
                }

                // PL 데이터에 고객사 이름 붙이기
                sale_data.forEach(o_data => o_data["cstco_name"] = customer_data.find(o_customer_data => o_customer_data.code === o_data.cstco_cd)?.name);
                rodr_data.forEach(o_data => o_data["cstco_name"] = customer_data.find(o_customer_data => o_customer_data.code === o_data.cstco_cd)?.name);
                count_data.forEach(o_data => o_data["cstco_name"] = customer_data.find(o_customer_data => o_customer_data.code === o_data.cstco_cd)?.name);

                // 고객사명 없는 데이터 제거
                sale_data = sale_data.filter(o_data => !!o_data.cstco_name);
                rodr_data = rodr_data.filter(o_data => !!o_data.cstco_name);
                count_data = count_data.filter(o_data => !!o_data.cstco_name);

                // Total 기준으로 상위 5개의 항목만 반환
                sale_data = sale_data.sort((oItem1, oItem2) => oItem2.total_data - oItem1.total_data).slice(0, 5);
                rodr_data = rodr_data.sort((oItem1, oItem2) => oItem2.total_data - oItem1.total_data).slice(0, 5);
                count_data = count_data.sort((oItem1, oItem2) => oItem2.total_data - oItem1.total_data).slice(0, 5);

                a_result = [...sale_data, ...rodr_data, ...count_data];
            }

            return a_result;
        } catch (error) {
            console.error(error);
            return { code: error.code, message: error.message, isError: true }
        }
    });
}