const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_cstco_by_biz_account_dt', async (req) => {
        try{
            /**
             * 핸들러 초기에 권한체크
             */
            await check_user_auth(req);

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
            const dt_org_view = db.entities('pl').wideview_dt_view;
            const dt_account_view = db.entities('pl').wideview_account_dt_view;

            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;

            // function 입력 파라미터
            const { year, month, org_id, account_cd } = req.data;
            const last_year = (Number(year) - 1).toString();

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
                SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', 'org_name','lv3_ccorg_cd','org_tp']).where({ 'org_id': org_id }),
            ]);

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error
            let org_tp = orgInfo.org_tp;
            let lv3_ccorg_cd = orgInfo.lv3_ccorg_cd;
            let org_col_nm = orgInfo.org_level

            let dt_view = dt_org_view
            if(org_col_nm !== 'lv1_ccorg_cd' && org_col_nm !== 'lv2_ccorg_cd' && ((org_tp === 'hybrid' && lv3_ccorg_cd === '237100') || org_tp === 'account')){
                dt_view = dt_account_view
            }
            
            // 당월 누계 계산식
            let a_sum_sale = [], a_sum_margin = [];
            for (let i = 1; i <= Number(month); i++) {
                a_sum_sale.push(`sale_m${i}_amt`);
                a_sum_margin.push(`margin_m${i}_amt`);
            }
            let s_sum_sale = a_sum_sale.join("+");
            let s_sum_margin = a_sum_margin.join("+");

            // pl_wideview_view 설정
            const pl_column = ['year', 'cstco_cd', 'cstco_name',
                `sum(${s_sum_sale}) as sale`,
                `sum(${s_sum_margin}) as margin`,
                `case when sum(${s_sum_sale}) = 0 then 0 else sum(${s_sum_margin}) / sum(${s_sum_sale}) end as margin_rate`
            ];
            const pl_where = {
                'year': { in: [year, last_year] }, cstco_name: { '!=': null }, [orgInfo.org_level]: orgInfo.org_ccorg_cd, src_type: { 'not in': ['D', 'WO'] },
                biz_tp_account_cd: account_cd
            };
            const pl_groupBy = ['year', 'cstco_cd', 'cstco_name'];

            // DB 쿼리 실행 (병렬)
            let [pl_data] = await Promise.all([
                SELECT.from(dt_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            ]);
            if (!pl_data.length) {
                //return req.res.status(204).send();
                return []
            }

            // 금년, 작년으로 필터링
            const pl_curr_data = pl_data.filter(oData => oData.year === year);
            const pl_last_data = pl_data.filter(oData => oData.year === last_year);

            // 상위 5개의 항목만 
            let a_sale_data = pl_curr_data.sort((oItem1, oItem2) => oItem2.sale - oItem1.sale).slice(0, 5);
            let a_margin_data = pl_curr_data.sort((oItem1, oItem2) => oItem2.margin - oItem1.margin).slice(0, 5);
            let a_margin_rate_data = pl_curr_data.sort((oItem1, oItem2) => oItem2.margin_rate - oItem1.margin_rate).slice(0, 5);

            // 전년 동기 붙이기
            a_sale_data.forEach(o_curr_data => {
                let o_last_data = pl_last_data.find(o_last_data => o_last_data.cstco_cd === o_curr_data.cstco_cd);
                a_result.push({
                    curr_value: o_curr_data?.sale || 0,
                    last_value: o_last_data?.sale || 0,
                    cstco_name: o_curr_data.cstco_name,
                    type: "매출",
                });
            })

            // a_margin_data.forEach(o_curr_data => {
            //     let o_last_data = pl_last_data.find(o_last_data => o_last_data.cstco_cd === o_curr_data.cstco_cd);
            //     a_result.push({
            //         curr_value: o_curr_data?.margin || 0,
            //         last_value: o_last_data?.margin || 0,
            //         cstco_name: o_curr_data.cstco_name,
            //         type: "마진",
            //     });
            // })

            // a_margin_rate_data.forEach(o_curr_data => {
            //     let o_last_data = pl_last_data.find(o_last_data => o_last_data.cstco_cd === o_curr_data.cstco_cd);
            //     a_result.push({
            //         curr_value: o_curr_data?.margin_rate || 0,
            //         last_value: o_last_data?.margin_rate || 0,
            //         cstco_name: o_curr_data.cstco_name,
            //         type: "마진율",
            //     });
            // })

            return a_result;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}