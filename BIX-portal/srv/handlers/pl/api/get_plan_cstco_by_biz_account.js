const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_plan_cstco_by_biz_account', async (req) => {
        try{
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
            const pl_org_view = db.entities('pl').wideview_view;
            const pl_account_view = db.entities('pl').wideview_account_view;

            const customer_view = db.entities("common").customer;

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
            
            let org_col_nm = orgInfo.org_level
            let org_tp = orgInfo.org_tp;
            let lv3_ccorg_cd = orgInfo.lv3_ccorg_cd;

            let pl_view = pl_org_view
            if(org_col_nm !== 'lv1_ccorg_cd' && org_col_nm !== 'lv2_ccorg_cd' && ((org_tp === 'hybrid' && lv3_ccorg_cd === '237100') || org_tp === 'account')){
                pl_view = pl_account_view
            }
            
            let i_index = Number(month) === 12? 12 : Number(month)+1
            let aForecastSale = []; 
            for (let i = 12; i >= i_index; i--) {
                aForecastSale.push(`sale_m${i}_amt`);
            }
            let s_forecast_sale = Number(month) === 12? 0 : aForecastSale.join(" + ");

            // pl_view 설정
            const pl_column = ['cstco_cd', 'cstco_name',
                `sum(case when src_type = 'D' then 0 else sale_year_amt end) as sale_secured`,
                `sum(case when src_type = 'D' then ${s_forecast_sale} else 0 end) as sale_not_secured`,
                `sum(case when src_type = 'D' then 0 else sale_year_amt end)
                    + sum(case when src_type = 'D' then ${s_forecast_sale} else 0 end) as sale_forecast`,
                ];
            const pl_where = { 'year': year, [orgInfo.org_level]: orgInfo.org_ccorg_cd, biz_tp_account_cd: account_cd, 
                'src_type': {'!=':'WO'}, cstco_name: { '!=': null }};
            const pl_groupBy = ['cstco_cd', 'cstco_name'];

            // customer 설정
            const customer_column = ["code", "name"];

            // DB 쿼리 실행 (병렬)
            let [pl_data, customer_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(customer_view).columns(customer_column),
            ]);
            
            if(!pl_data.length){
                //return req.res.status(204).send();
                return []
            }

            // 고객사명 없는 데이터 제거
            pl_data = pl_data.filter(o_pl_data => !!o_pl_data.cstco_name);

            // 연간 추정을 기준으로 상위 5개의 항목만 
            let a_sale_data = pl_data.sort((oItem1, oItem2) => oItem2.sale_forecast - oItem1.sale_forecast).slice(0, 5);

            // 데이터 가공
            a_sale_data.forEach(o_curr_data => {
                a_result.push({
                    secured: o_curr_data?.sale_secured??0,
                    not_secured: o_curr_data?.sale_not_secured??0,
                    forecast: o_curr_data?.sale_forecast??0,
                    cstco_name: o_curr_data?.cstco_name??0,
                    type: "매출",
                });
            })

            return a_result;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}