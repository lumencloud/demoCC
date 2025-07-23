const get_org_target = require('../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_actual_sale_org_pl_total', async (req) => {
        try{
            //
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
            const pl_view = db.entities('pl').wideview_org_view;

            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;
            // =================================================================================

            // function 입력 파라미터
            const { year, month } = req.data;
            const last_year = (Number(year) - 1).toString();

            let a_sale_column = [];
            let a_sale_total_column = [];
            let a_margin_column = [];
            let a_margin_total_column = [];
            for (let i = 1; i <= 12; i++) {
                if (i <= Number(month)) {
                    a_sale_column.push(`sum(sale_m${i}_amt)`)
                    a_margin_column.push(`sum(margin_m${i}_amt)`)
                };
                a_sale_total_column.push(`sum(sale_m${i}_amt)`)
                a_margin_total_column.push(`sum(margin_m${i}_amt)`)
            };

            let sale_sum_col = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
            let sale_sum_total_col = "(" + a_sale_total_column.join(' + ') + ') as sale_total_amount_sum';
            let margin_sum_col = "(" + a_margin_column.join(' + ') + ') as margin_amount_sum';
            let margin_sum_total_col = "(" + a_margin_total_column.join(' + ') + ') as margin_total_amount_sum';

            /**
             * 최상위 조직 정보 반환
             */
            const orgInfo = await SELECT.one.from(org_full_level).where({ org_id: { '!=': null }, org_parent: null });
            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_col_nm = 'lv1_id';
            let org_col_nm_name = orgInfo[org_col_nm.split('_', 1) + '_name'];
            let org_ccorg = orgInfo.org_ccorg_cd;
            let org_ccorg_col = org_col_nm.split('_', 1) + '_ccorg_cd';
            let search_org, search_org_name, search_org_ccorg;

            const pl_col_list = ['year', sale_sum_col, sale_sum_total_col, margin_sum_col, margin_sum_total_col];
            if (org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id') {
                search_org = 'div_id';
                search_org_name = 'div_name';
                search_org_ccorg = 'div_ccorg_cd';
                let aAddList = [search_org, search_org_name];
                pl_col_list.push(...aAddList);
            } else if (org_col_nm === 'div_id') {
                search_org = 'hdqt_id';
                search_org_name = 'hdqt_name';
                search_org_ccorg = 'hdqt_ccorg_cd';
                let aAddList = [search_org, search_org_name];
                pl_col_list.push(...aAddList);
            } else if (org_col_nm === 'hdqt_id' || org_col_nm === 'team_id') {
                search_org = 'team_id';
                search_org_name = 'team_name';
                search_org_ccorg = 'team_ccorg_cd';
                let aAddList = [search_org, search_org_name];
                pl_col_list.push(...aAddList);
            } else { return; };

            const org_query = await SELECT.from(org_full_level).columns([search_org, search_org_name, search_org_ccorg, 'org_order']).where({ [org_col_nm]: orgInfo.org_id }).orderBy('org_order');

            //조직 리스트
            let org_list = [];
            org_query.forEach(data => {
                if (org_col_nm === 'hdqt_id' || org_col_nm === 'team_id') {
                    if (orgInfo.org_id === data['org_id']) {
                        let oTemp = {
                            id: data['org_id'],
                            name: data['org_name'],
                            ccorg: data['org_ccorg_cd'],
                            org_order: data['org_order']
                        };
                        org_list.push(oTemp);
                    };
                } else {
                    if (!org_list.find(data2 => data2.id === data[search_org]) && data[search_org]) {
                        let oTemp = {
                            id: data[search_org],
                            name: data[search_org_name],
                            ccorg: data[search_org_ccorg],
                            org_order: data['org_order']
                        };
                        org_list.push(oTemp);
                    };
                }
            });

            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            const pl_where_conditions = { 'year': { in: [year, last_year] } };
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: orgInfo.org_id };
            const pl_groupBy_cols = ['year', search_org, search_org_name];

            // DB 쿼리 실행 (병렬)
            const [pl_data, target_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols),
                get_org_target(year,['A01','A02','A03'])
            ]);
            // if(!pl_data.length && !target_data.length){
            //     //return req.res.status(204).send();
            //     return []
            // }

            // pl_data 결과 값 flat 하게 데이터 구성
            let flat_pl = pl_data.reduce((acc, item) => {
                let main = item[search_org];
                let sub = item['year'];
                let rest = { ...item };
                delete rest[search_org];
                delete rest['year'];
                Object.entries(rest).forEach(([key, value]) => {
                    acc[`_${main}_${sub}_${key}`] = value;
                });
                return acc;
            }, {});

            let i_count = 0
            let o_total_target = target_data.find(target => target.org_id === orgInfo.org_id)
            let total_data = [
                {
                    "display_order": i_count,
                    "org_id": "total",
                    "org_name": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계',
                    "type": '매출',
                    "target_curr_y_value": o_total_target?.target_sale ?? 0,
                    "target_last_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                },
                {
                    "display_order": ++i_count,
                    "org_id": "total",
                    "org_name": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계',
                    "type": '마진',
                    "target_curr_y_value": o_total_target?.target_margin ?? 0,
                    "target_last_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                },
                {
                    "display_order": ++i_count,
                    "org_id": "total",
                    "org_name": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계',
                    "type": '마진율',
                    "target_curr_y_value": (o_total_target?.target_margin_rate ?? 0) / 100,
                    "target_last_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                }
            ];

            let org_data = [];
            org_list.forEach(data => {
                let o_target = target_data.find(target => target.org_id === data.id)
                let sale_data =
                {
                    "display_order": ++i_count,
                    "org_id": data.id,
                    "org_name": data.name,
                    "type": "매출",
                    "target_curr_y_value": o_target?.target_sale ?? 0,
                    "actual_curr_ym_value": flat_pl?.[`_${data.id}_${year}_sale_amount_sum`] ?? 0,
                    "actual_last_ym_value": flat_pl?.[`_${data.id}_${last_year}_sale_amount_sum`] ?? 0,
                    "actual_curr_ym_rate": o_target?.target_sale ?? 0 === 0 ? 0 : (flat_pl?.[`_${data.id}_${year}_sale_amount_sum`] ?? 0) / ((o_target?.target_sale ?? 0) * 100000000),
                    "actual_last_ym_rate": (flat_pl?.[`_${data.id}_${last_year}_sale_total_amount_sum`] ?? 0) === 0 ? 0 : (flat_pl?.[`_${data.id}_${last_year}_sale_amount_sum`] ?? 0) / (flat_pl?.[`_${data.id}_${last_year}_sale_total_amount_sum`] ?? 0)
                };

                let margin_data =
                {
                    "display_order": ++i_count,
                    "org_id": data.id,
                    "org_name": data.name,
                    "type": "마진",
                    "target_curr_y_value": o_target?.target_margin ?? 0,
                    "actual_curr_ym_value": flat_pl?.[`_${data.id}_${year}_margin_amount_sum`] ?? 0,
                    "actual_last_ym_value": flat_pl?.[`_${data.id}_${last_year}_margin_amount_sum`] ?? 0,
                    "actual_curr_ym_rate": o_target?.target_margin ?? 0 === 0 ? 0 : (flat_pl?.[`_${data.id}_${year}_margin_amount_sum`] ?? 0) / ((o_target?.target_margin ?? 0) * 100000000),
                    "actual_last_ym_rate": (flat_pl?.[`_${data.id}_${last_year}_margin_total_amount_sum`] ?? 0) === 0 ? 0 : (flat_pl?.[`_${data.id}_${last_year}_margin_amount_sum`] ?? 0) / (flat_pl?.[`_${data.id}_${last_year}_margin_total_amount_sum`] ?? 0)
                };

                let margin_rate_curr = (flat_pl?.[`_${data.id}_${year}_sale_amount_sum`] ?? 0) === 0 ? 0 : (flat_pl?.[`_${data.id}_${year}_margin_amount_sum`] ?? 0) / (flat_pl?.[`_${data.id}_${year}_sale_amount_sum`] ?? 0);
                let margin_rate_last = (flat_pl?.[`_${data.id}_${last_year}_sale_amount_sum`] ?? 0) === 0 ? 0 : (flat_pl?.[`_${data.id}_${last_year}_margin_amount_sum`] ?? 0) / (flat_pl?.[`_${data.id}_${last_year}_sale_amount_sum`] ?? 0);
                let margin_rate_data =
                {
                    "display_order": ++i_count,
                    "org_id": data.id,
                    "org_name": data.name,
                    "type": "마진율",
                    "target_curr_y_value": (o_target?.target_margin_rate ?? 0) / 100,
                    "actual_curr_ym_value": margin_rate_curr,
                    "actual_last_ym_value": margin_rate_last,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0
                    // "actual_curr_ym_rate": (Number(flat_target?.[`_${data.id}_${year}_target_margin_rate`] ?? 0)) === 0 ? 0 : margin_rate_curr / (Number(flat_target?.[`_${data.id}_${year}_target_margin_rate`] ?? 0)),
                    // "actual_last_ym_rate": (flat_pl?.[`_${data.id}_${last_year}_sale_total_amount_sum`] ?? 0) === 0 ? 0 : margin_rate_last / ((flat_pl?.[`_${data.id}_${last_year}_margin_total_amount_sum`] ?? 0) / (flat_pl?.[`_${data.id}_${last_year}_sale_total_amount_sum`] ?? 0)),
                };

                org_data.push(sale_data, margin_data, margin_rate_data);
            });

            pl_data.forEach(data => {
                if (data.year === year) {
                    total_data[0].actual_curr_ym_value += data.sale_amount_sum;
                    total_data[1].actual_curr_ym_value += data.margin_amount_sum;
                } else if (data.year === last_year) {
                    total_data[0].actual_last_ym_value += data.sale_amount_sum;
                    total_data[1].actual_last_ym_value += data.margin_amount_sum;

                    total_data[0].target_last_y_value += data.sale_total_amount_sum;
                    total_data[1].target_last_y_value += data.margin_total_amount_sum;
                };
            })
            total_data[2].target_last_y_value = (total_data[0]?.target_last_y_value ?? 0) === 0 ? 0 : (total_data[1]?.target_last_y_value ?? 0) / (total_data[0]?.target_last_y_value ?? 0);
            total_data[2].actual_curr_ym_value = (total_data[0].actual_curr_ym_value ?? 0) === 0 ? 0 : (total_data[1].actual_curr_ym_value ?? 0) / (total_data[0].actual_curr_ym_value ?? 0);
            total_data[2].actual_last_ym_value = (total_data[0].actual_last_ym_value ?? 0) === 0 ? 0 : (total_data[1].actual_last_ym_value ?? 0) / (total_data[0].actual_last_ym_value ?? 0);

            oResult.push(...total_data, ...org_data)
            return oResult
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}