const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_dt_task_year_oi', async (req) => {
        try{
            /**
             * 핸들러 초기에 권한체크
             */
            await check_user_auth(req);

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
            const pl_org_view = db.entities('pl').wideview_view;
            const pl_account_view = db.entities('pl').wideview_account_view;
            const pl_sfdc_contract_view = db.entities('pl').sfdc_contract_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;
            const dt_task = db.entities('common').dt_task;
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id } = req.data;

            /**
             * +++++ TBD +++++
             * 권한 체크하여 사용자가 조회 가능한 조직인지 판별 후 코드 진행
             */

            /**
             * org_id 파라미터값으로 조직정보 조회
             * 
             */
            const orgInfo = await SELECT.one.from(org_full_level).columns(['org_ccorg_cd', 'org_level','lv3_ccorg_cd','org_tp'])
                .where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            // 조직 정보를 where 조건에 추가
            let org_level_id = orgInfo.org_level + "_id";
            let lv3_ccorg_cd = orgInfo.lv3_ccorg_cd;
            let org_tp = orgInfo.org_tp;

            let pl_view = pl_org_view
            if(org_level_id !== 'lv1_id' && org_level_id !== 'lv2_id' && ((org_tp === 'hybrid' && lv3_ccorg_cd === '237100') || org_tp === 'account')){
                pl_view = pl_account_view
                console.log('account')
            }

            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            const dt_where = { 'length(dgtr_task_cd)': { '>': 0, }, [org_level_id]: org_id, 'year': { '<=': year } };

            // sfdc
            const sfdc_where = { 'length(dgtr_task_cd)': { '>': 0, }, [org_level_id]: org_id, 'year': { '>': year } };

            // 연도 목록 반환
            const [dt_year_data, sfdc_year_data, dt_task_data] = await Promise.all([
                SELECT.from(pl_view).columns(['year']).where(dt_where).groupBy('year').orderBy("year"),
                SELECT.from(pl_sfdc_contract_view).columns(['year']).where(sfdc_where).groupBy('year').orderBy("year"),
                SELECT.from(dt_task).columns(['dgtr_task_cd', 'dgtr_task_nm', 'sort_order']).orderBy("sort_order"),
            ]);

            // 연도 목록을 기준으로 컬럼 추가
            let dt_column = ['dgtr_task_cd'];
            let dt_total = [];
            dt_year_data.forEach(o_year_data => {
                let sYear = o_year_data.year;
                dt_column.push(`sum(case when year='${sYear}' then sale_year_amt else 0 end) as ${sYear}`);

                // 행별 합계를 위한 컬럼
                dt_total.push(`sum(case when year='${sYear}' then sale_year_amt else 0 end)`)
            });
            if(dt_year_data.length>0){
                let s_dt_total = dt_total.join(" + ")
                dt_column.push(`${s_dt_total} as total_sale`);
            }
            
            let sfdc_column = ['dgtr_task_cd'];
            let sfdc_total = [];
            sfdc_year_data.forEach(o_year_data => {
                let sYear = o_year_data.year;
                sfdc_column.push(`sum(case when year='${sYear}' then sale_year_amt else 0 end) as ${sYear}`);

                // 행별 합계를 위한 컬럼
                sfdc_total.push(`sum(case when year='${sYear}' then sale_year_amt else 0 end)`)
            });
            
            if(sfdc_year_data.length>0){
                let s_sfdc_total = sfdc_total.join(" + ")
                sfdc_column.push(`${s_sfdc_total} as total_sale`);
            }

            // 연도에 따른 데이터 반환
            const [dt_data, sfdc_data] = await Promise.all([
                SELECT.from(pl_view).columns(dt_column).where(dt_where).groupBy('dgtr_task_cd'),
                SELECT.from(pl_sfdc_contract_view).columns(sfdc_column).where(sfdc_where).groupBy('dgtr_task_cd'),
            ]);
            
            if(!dt_data.length && !sfdc_data.length){
                //return req.res.status(204).send();
                return []
            }

            // 데이터를 과제 기준으로 합치기
            let a_result = dt_task_data.map(o_task_data => {
                let o_dt_data = dt_data.find(o_data => o_data.dgtr_task_cd === o_task_data.dgtr_task_cd);
                let o_sfdc_data = sfdc_data.find(o_data => o_data.dgtr_task_cd === o_task_data.dgtr_task_cd);

                // 객체 합치기
                let object = { ...o_task_data, ...o_dt_data, ...o_sfdc_data };

                // total_sale만 두 개 따로 합산
                object["total_sale"] = (o_dt_data?.total_sale??0) + (o_sfdc_data?.total_sale??0);
                return object;
            })

            // dgtr_task_cd, dgtr_task_nm을 id, name으로 변경
            a_result = a_result.map(({ dgtr_task_cd, dgtr_task_nm, ...rest }) => ({
                id: dgtr_task_cd,
                name: dgtr_task_nm,
                ...rest
            }))

            // 합계 합산
            let o_total = {
                "sort_order": 0,
                "id": 'total',
                "name": "합계",
            }

            // 전체 연도 목록
            let full_year = [...dt_year_data, ...sfdc_year_data];
            full_year.forEach(o_data => {
                o_total[o_data.year] = a_result.reduce((iSum, o_result) => iSum += (o_result?.[o_data?.year] || 0), 0) || 0;
            })

            // 합계 합산
            o_total["total_sale"] = a_result.reduce((iSum, o_result) => iSum += (o_result?.["total_sale"] || 0), 0) || 0;

            // 최종 배열에 합계 추가
            oResult.push(o_total, ...a_result);

            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}