const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_actual_sale_sub_company_pl', async (req) => {
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
             * sc.pl_wideview [실적]
             * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const sc_view = db.entities('sc').pl_wideview;
            /**
             * common_org_full_level_view [조직정보]
             */
            const org_full_level = db.entities('common').org_full_level_view;
            // =================================================================================

            const { year, month } = req.data;
            const last_year = (Number(year) - 1).toString();

            // QUERY 공통 파라미터 선언
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

            let s_sale_column = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
            let s_sale_total_column = "(" + a_sale_total_column.join(' + ') + ') as sale_total_amount_sum';
            let s_margin_column = "(" + a_margin_column.join(' + ') + ') as margin_amount_sum';
            let s_margin_total_column = "(" + a_margin_total_column.join(' + ') + ') as margin_total_amount_sum';

            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            const sc_col_list = [
                'year', s_sale_column, s_sale_total_column, s_margin_column, s_margin_total_column, 'substring(prj_no, 0, 3) as nation'];
            const sc_where_conditions = { 'year': { in: [year, last_year] }};
            const sc_groupBy_cols = ['year','prj_no'];

            // DB 쿼리 실행 (병렬)
            const [target_data,sc_data,org_query] = await Promise.all([
                get_org_target(year,['A01','A02','A03']),
                SELECT.from(sc_view).columns(sc_col_list).where(sc_where_conditions).groupBy(...sc_groupBy_cols),
                SELECT.from(org_full_level).where({'div_ccorg_cd':'241100', 'org_level':'hdqt', 'org_tp':'staff'})
            ]);

            if(!sc_data.length){
                //return req.res.status(204).send();
                return []
            }

            let total_data = [{
                "org_ccorg_cd": '합계',
                "id": 'total',
                "org_name": '합계',
                "type": '매출',
                "org_order":'001',
                "target_curr_y_value": 0,
                "actual_curr_ym_value": 0,
                "actual_last_ym_value": 0,
                "actual_curr_ym_rate": 0,
                "actual_last_ym_rate": 0,
                "actual_last_y_value": 0
            },{
                "org_ccorg_cd": '합계',
                "id": 'total',
                "org_name": '합계',
                "type": '마진',
                "org_order":'002',
                "target_curr_y_value": 0,
                "actual_curr_ym_value": 0,
                "actual_last_ym_value": 0,
                "actual_curr_ym_rate": 0,
                "actual_last_ym_rate": 0,
                "actual_last_y_value": 0
            },{
                "org_ccorg_cd": '합계',
                "id": 'total',
                "org_name": '합계',
                "type": '마진율',
                "org_order":'003',
                "target_curr_y_value": 0,
                "actual_curr_ym_value": 0,
                "actual_last_ym_value": 0,
                "actual_curr_ym_rate": 0,
                "actual_last_ym_rate": 0,
                "actual_last_y_value": 0
            }];

            let sc_sum_data = {};
            sc_data.forEach(data=>{
                if(!sc_sum_data[`${data.nation}`]){
                    sc_sum_data[`${data.nation}`] = {id : data.nation}
                }
                if(data.year === year){
                    sc_sum_data[`${data.nation}`]['curr_sale'] = (sc_sum_data?.[`${data.nation}`]['curr_sale'] ?? 0) + (data?.sale_amount_sum ?? 0);
                    sc_sum_data[`${data.nation}`]['curr_sale_sum'] = (sc_sum_data?.[`${data.nation}`]['curr_sale_sum'] ?? 0) + (data?.sale_total_amount_sum ?? 0);
                    sc_sum_data[`${data.nation}`]['curr_margin'] = (sc_sum_data?.[`${data.nation}`]['curr_margin'] ?? 0) + (data?.margin_amount_sum ?? 0);
                    sc_sum_data[`${data.nation}`]['curr_margin_sum'] = (sc_sum_data?.[`${data.nation}`]['curr_margin_sum'] ?? 0) + (data?.margin_total_amount_sum ?? 0);

                    total_data[0].actual_curr_ym_value += data?.sale_amount_sum ?? 0;
                    total_data[1].actual_curr_ym_value += data?.margin_amount_sum ?? 0;
                }else if(data.year === last_year){
                    sc_sum_data[`${data.nation}`]['last_sale'] = (sc_sum_data?.[`${data.nation}`]['last_sale'] ?? 0) + (data?.sale_amount_sum ?? 0);
                    sc_sum_data[`${data.nation}`]['last_sale_sum'] = (sc_sum_data?.[`${data.nation}`]['last_sale_sum'] ?? 0) + (data?.sale_total_amount_sum ?? 0);
                    sc_sum_data[`${data.nation}`]['last_margin'] = (sc_sum_data?.[`${data.nation}`]['last_margin'] ?? 0) + (data?.margin_amount_sum ?? 0);
                    sc_sum_data[`${data.nation}`]['last_margin_sum'] = (sc_sum_data?.[`${data.nation}`]['last_margin_sum'] ?? 0) + (data?.margin_total_amount_sum ?? 0);

                    total_data[0].actual_last_ym_value += data?.sale_amount_sum ?? 0;
                    total_data[0].actual_last_y_value += data?.sale_total_amount_sum ?? 0;
                    total_data[1].actual_curr_ym_value += data?.margin_amount_sum ?? 0;
                    total_data[1].actual_last_y_value += data?.margin_total_amount_sum ?? 0;
                };
            });
            let a_sc_data = Object.values(sc_sum_data);

            const a_list=[];
            org_query.forEach(data=>{
                let nation;
                switch (data.org_ccorg_cd) {
                    case "321100":
                        {
                            nation = 'USA';
                            break;
                        }
                    case "321200":
                        {
                            nation = 'EUR';
                            break;
                        }
                    case "524500":
                        {
                            nation = 'CHN';
                            break;
                        }
                    case "524900":
                        {
                            nation = 'JPA';
                            break;
                        }
                }
                let temp = {
                    name:data.org_name,
                    id:nation,
                    org_ccorg_cd:data.org_ccorg_cd,
                    org_order:data.org_order
                }
                a_list.push(temp);
            });
            a_list.push({name:'ATS', id:'ATS', org_order:'9999999999999', org_ccorg_cd:'999999'});

            let org_data=[];
            const a_type_list = ['매출','마진','마진율']
            a_list.map(list=>{
                for(const type of a_type_list){
                    const o_temp = {
                        "id": list.id,
                        "org_ccorg_cd": list.org_ccorg_cd,
                        "org_name": list.name,
                        "type": type,
                        "org_order":list.org_order,
                        "target_curr_y_value": 0,
                        "actual_curr_ym_value": 0,
                        "actual_last_ym_value": 0,
                        "actual_curr_ym_rate": 0,
                        "actual_last_ym_rate": 0,
                    };
                    org_data.push(o_temp)
                }
            })

            let sum_target_data = {sum_target_sale:0,sum_target_margin:0};

            org_data.forEach(data=>{
                let find_sc_data = a_sc_data.find(data2=>data2.id === data.id);
                let find_target_data = target_data.find(data2=>data2.org_ccorg_cd === data.org_ccorg_cd);

                if(data.type === '매출'){
                    data.target_curr_y_value = find_target_data?.target_sale ?? 0;
                    data.actual_curr_ym_value = find_sc_data?.curr_sale ?? 0;
                    data.actual_last_ym_value = find_sc_data?.last_sale ?? 0;
                    data.actual_curr_ym_rate = (find_target_data?.target_sale ?? 0) === 0 ? 0 : (find_sc_data?.curr_sale ?? 0) / ((find_target_data?.target_sale ?? 0)*100000000);
                    data.actual_last_ym_rate = (find_sc_data?.last_sale_sum ?? 0) === 0 ? 0 : (find_sc_data?.last_sale ?? 0) / (find_sc_data?.last_sale_sum ?? 0);

                    sum_target_data.sum_target_sale += (find_target_data?.target_sale ?? 0)
                    sum_target_data.sum_target_margin += (find_target_data?.target_margin ?? 0)
                }else if(data.type === '마진'){
                    data.target_curr_y_value = find_target_data?.target_margin ?? 0;
                    data.actual_curr_ym_value = find_sc_data?.curr_margin ?? 0;
                    data.actual_last_ym_value = find_sc_data?.last_margin ?? 0;
                    data.actual_curr_ym_rate = (find_target_data?.target_margin ?? 0) === 0 ? 0 :  (find_sc_data?.curr_margin ?? 0) / ((find_target_data?.target_margin ?? 0)*100000000);
                    data.actual_last_ym_rate = (find_sc_data?.last_margin_sum ?? 0) === 0 ? 0 : (find_sc_data?.last_margin ?? 0) / (find_sc_data?.last_margin_sum ?? 0);
                }else if(data.type === '마진율'){
                    data.target_curr_y_value = (find_target_data?.target_margin_rate ?? 0)/100;
                    data.actual_curr_ym_value = (find_sc_data?.curr_sale ?? 0) === 0 ? 0 : (find_sc_data?.curr_margin ?? 0) / (find_sc_data?.curr_sale ?? 0);
                    data.actual_last_ym_value = (find_sc_data?.last_sale ?? 0) === 0 ? 0 : (find_sc_data?.last_margin ?? 0) / (find_sc_data?.last_sale ?? 0);
                    data.actual_curr_ym_rate = 0;
                    data.actual_last_ym_rate = 0;
                };
            });
            
            total_data[0].target_curr_y_value = sum_target_data.sum_target_sale
            total_data[1].target_curr_y_value = sum_target_data.sum_target_margin
            total_data[2].target_curr_y_value = sum_target_data.sum_target_sale === 0 ? 0 : sum_target_data.sum_target_margin/sum_target_data.sum_target_sale

            total_data[0].actual_curr_ym_rate = total_data[0].target_curr_y_value === 0 ? 0 : total_data[0].actual_curr_ym_value / (total_data[0].target_curr_y_value * 100000000);
            total_data[0].actual_last_ym_rate = total_data[0].actual_last_y_value === 0 ? 0 : total_data[0].actual_last_ym_value / total_data[0].actual_last_y_value;
            total_data[1].actual_curr_ym_rate = total_data[1].target_curr_y_value === 0 ? 0 : total_data[1].actual_curr_ym_value / (total_data[1].target_curr_y_value * 100000000);
            total_data[1].actual_last_ym_rate = total_data[1].actual_last_y_value === 0 ? 0 : total_data[1].actual_last_ym_value / total_data[1].actual_last_y_value;
            total_data[2].actual_curr_ym_value = total_data[0].actual_curr_ym_value === 0 ? 0 : total_data[1].actual_curr_ym_value / total_data[0].actual_curr_ym_value;
            total_data[2].actual_last_ym_value = total_data[0].actual_last_ym_value === 0 ? 0 : total_data[1].actual_last_ym_value / total_data[0].actual_last_ym_value;

            oResult.push(...total_data, ...org_data)

            let a_sort_field = [
                { field: "org_order", order: "asc" },
            ];
            oResult.sort((oItem1, oItem2) => {
                for (const { field, order } of a_sort_field) {
                    // 필드가 null일 때
                    if (oItem1[field] === null && oItem2[field] !== null) return -1;
                    if (oItem1[field] !== null && oItem2[field] === null) return 1;
                    if (oItem1[field] === null && oItem2[field] === null) continue;

                    if (typeof oItem1[field] === "number") {
                        var result = oItem1[field] - oItem2[field];
                    } else {
                        var result = oItem1[field].localeCompare(oItem2[field]);
                    }

                    if (result !== 0) {
                        return (order === "asc") ? result : -result;
                    }
                }
                return 0;
            })
            
            return oResult
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}