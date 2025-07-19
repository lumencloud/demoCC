const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_dt_task_oi', async (req) => {
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
             * common_target
             * 조직 별 연단위 목표금액
             */
            const target = db.entities('common').annual_target_temp_view;
            /**
             * pl.wideview_view [실적]
             * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_view = db.entities('pl').wideview_dt_view;
            //org_tp:account, hybrid일 경우 사용
            const account_pl_view = db.entities('pl').wideview_account_dt_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;
            /**
             * common.dt_task [과제정보]
             * 조직구조 테이블
             */
            const dt_task = db.entities('common').dt_task
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id } = req.data;
            const last_year = (Number(year) - 1).toString();

            // QUERY 공통 파라미터 선언
            /** 
             * 타겟 뷰 조회용 컬럼
             */
            const target_col_list = [
                'year',
                'target_type_cd',
                'dt_sort_order',
                'ifnull(sale_target,0) as sale_target'
            ];
            const target_where_conditions = { 'year': { in: [year, last_year] }, 'target_type': 'dgtr_task_cd' };
            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            let a_sale_column = [];
            for (let i = 1; i <= Number(month); i++) {
                a_sale_column.push(`sum(sale_m${i}_amt)`)
            }
            let s_sale_column = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
            const pl_col_list = ['year', 'dgtr_task_cd', s_sale_column];
            const pl_where_conditions = { 'year': { in: [year, last_year] } };
            const pl_groupBy_cols = ['year', 'dgtr_task_cd'];

            /**
             * org_id 파라미터값으로 조직정보 조회
             * 
             */
            let orgInfo = await SELECT.one.from(org_full_level).columns(['org_level', 'org_ccorg_cd', 'org_tp', 'lv3_ccorg_cd'])
                .where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level+'_id';
            // ccorg_cd 만 가지고 있는 경우 조회조건으로 사용

            // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
            let target_column = target_col_list;
            let target_where = target_where_conditions;

            let pl_column = pl_col_list;
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            let pl_groupBy = pl_groupBy_cols;

            let pl_view_selec;
            if((org_col_nm !== 'lv1_id' || org_col_nm !== 'lv2_id') && orgInfo.lv3_ccorg_cd === '237100' || orgInfo.org_tp === 'account'){
                pl_view_selec = account_pl_view;
            }else{
                pl_view_selec = pl_view;
            };

            // DB 쿼리 실행 (병렬)
            const [target_data, pl_data, dt_task_data] = await Promise.all([
                SELECT.from(target).columns(target_column).where(target_where),
                SELECT.from(pl_view_selec).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(dt_task).columns(['dgtr_task_cd', 'dgtr_task_nm', 'sort_order']).orderBy('sort_order')
            ]);
            if(!pl_data.length){
                //return req.res.status(204).send();
                return []
            }

            // 올해 목표값
            let a_curr_target = target_data.filter(oData => oData.year = year);

            let o_data = {}
            pl_data.forEach(o_pl => {
                let o_find_dt = dt_task_data.find(data => data.dgtr_task_cd === o_pl.dgtr_task_cd);
                if (o_find_dt) {
                    if (!o_data[`${o_pl.dgtr_task_cd}`]) {
                        o_data[`${o_pl.dgtr_task_cd}`] = { id: o_pl.dgtr_task_cd };
                    }
                    if (o_pl.year === year) {
                        o_data[`${o_pl.dgtr_task_cd}`][`${year}`] = o_pl.sale_amount_sum;
                    } else if (o_pl.year === last_year) {
                        o_data[`${o_pl.dgtr_task_cd}`][`${last_year}`] = o_pl.sale_amount_sum;
                    }
                }
            })

            let a_result = Object.values(o_data);
            let o_total = { "display_order": 0, "id": 'total', "name": '합계' };
            dt_task_data.forEach(a => {
                const o_result_data = a_result.find(b => a.dgtr_task_cd === b.id);

                let i_target = a_curr_target.find(oData => oData.target_type_cd === a.dgtr_task_cd)?.sale_target || 0;

                let o_temp = {
                    "display_order": a.sort_order,
                    "id": a.dgtr_task_cd,
                    "name": a.dgtr_task_nm,
                    "target_curr_y_value": i_target,
                    "actual_curr_ym_value": o_result_data?.[`${year}`] ?? 0,
                    "actual_curr_ym_rate": (i_target) === 0 ? 0 : (o_result_data?.[`${year}`] ?? 0) / (i_target * 100000000),
                }
                oResult.push(o_temp)
            })

            oResult.sort((a, b) => a.display_order - b.display_order);
            a_result.forEach(data => {
                o_total['actual_curr_ym_value'] = (o_total['actual_curr_ym_value'] || 0) + (data?.[`${year}`] ?? 0);
            });

            o_total['target_curr_y_value'] = a_curr_target.reduce((iSum, oData) => iSum += oData.sale_target, 0).toFixed(2) || 0;
            o_total['actual_curr_ym_rate'] = (o_total?.['target_curr_y_value'] ?? 0) === 0 ? 0 : (o_total?.['actual_curr_ym_value'] ?? 0) / ((o_total?.['target_curr_y_value'] ?? 0) * 100000000);
            oResult.unshift(o_total);

            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}