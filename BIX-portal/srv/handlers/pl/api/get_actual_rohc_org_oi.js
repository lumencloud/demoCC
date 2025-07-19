const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_actual_rohc_org_oi', async (req) => {
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
             * pl.wideview_org_view [실적]
             * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_view = db.entities('pl').wideview_org_view;
            //org_tp:account, hybrid일 경우 사용
            const account_pl_view = db.entities('pl').wideview_account_org_view;
            /**
             * sga.wideview_view [sg&a 집계]
             * [부문/본부/팀 + 년,month_amt,금액] 프로젝트 판관비 집계 뷰
             */
            const sga_view = db.entities('sga').wideview_view;
            /**
             * rsp.wideview_view [비용 집계]
             * [부문/본부/팀 + 년,month_amt,금액] 프로젝트 비용 집계 뷰
             */
            const rsp_view = db.entities('rsp').wideview_view;

            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
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
            let orgInfo = await SELECT.one.from(org_full_level).columns(['org_level', 'org_ccorg_cd', 'org_name', 'org_tp', 'lv3_ccorg_cd'])
                .where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            // 조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level+'_id';

            // QUERY 공통 파라미터 선언
            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            let a_margin_column = [];
            let a_margin_total_column = [];
            let a_sga_column = [];
            let a_sga_total_column = [];
            let a_rsp_total_amt_ym = [];
            let a_rsp_total_amt_y_total = [];
            for(let i=1;i<=12; i++){
                if(i<=Number(month)){
                    a_margin_column.push(`ifnull(sum(margin_m${i}_amt), 0)`)
                    a_sga_column.push(`ifnull(sum(labor_m${i}_amt), 0)+ifnull(sum(exp_m${i}_amt), 0)+ifnull(sum(iv_m${i}_amt), 0)`)
                    a_rsp_total_amt_ym.push(`ifnull(sum(total_m${i}_amt), 0)`)
                };
                a_margin_total_column.push(`ifnull(sum(margin_m${i}_amt), 0)`)
                a_sga_total_column.push(`ifnull(sum(labor_m${i}_amt), 0)+ifnull(sum(exp_m${i}_amt), 0)+ifnull(sum(iv_m${i}_amt), 0)`)
                a_rsp_total_amt_y_total.push(`ifnull(sum(total_m${i}_amt), 0)`)
            };
            let s_margin_column = "("+a_margin_column.join(' + ')+') as margin_amount_sum';
            let s_margin_sum_total_col = "("+a_margin_total_column.join(' + ')+') as margin_total_amount_sum';
            let s_sga_column = "(" + a_sga_column.join(' + ') + ') as amount_sum';
            let s_sga_total_column = "(" + a_sga_total_column.join(' + ') + ') as amount_total_sum';
            let s_rsp_total_amt_ym = "(" + a_rsp_total_amt_ym.join(' + ') + ') as total_year_amt';
            let s_rsp_total_amt_ym_total = "(" + a_rsp_total_amt_y_total.join(' + ') + ')  as total_amt_year_sum';

            const pl_col_list = ['year', s_margin_column, s_margin_sum_total_col];
            const pl_where_conditions = { 'year': { in: [year, last_year] } };
            const pl_groupBy_cols = ['year'];
            /**
             * SG&A 조회용 컬럼
             * shared_exp_yn false = 사업 / true = 전사
             */

            const sga_col_list = ['year', s_sga_column, s_sga_total_column];
            const sga_where_conditions = { 'year': { in: [year, last_year] }, 'is_total_cc': { in: [false, null] } };
            const sga_groupBy_cols = ['year'];

            // rsp 조회용 정보
            const rsp_col_list = ['year', s_rsp_total_amt_ym, s_rsp_total_amt_ym_total];
            const rsp_groupBy_cols = ['year'];
            const rsp_where_conditions = { 'year': { in: [year, last_year] }, [org_col_nm]: org_id, is_delivery: true };

            // 선택한 조직에 따른 조직 호출 (부문보다 높을 시 부문 단위, 부문일 때 본부 단위, 본부일 때 팀 단위)
            let org_where = { [org_col_nm]: orgInfo.org_ccorg_cd};
            if (org_col_nm.includes("lv")) {    // 부문보다 높은 조직은 부문 목록 반환
                org_where["org_level"] = "div";
            } else if (org_col_nm.includes("div")) {    // 부문은 부문 하위의 본부 목록 반환
                org_where["org_level"] = "hdqt";
            } else if (org_col_nm.includes("hdqt")) {   // 본부는 본부 하위의 팀 목록 반환
                org_where["org_level"] = "team";
            } else if (org_col_nm.includes("team")) {   // 팀
                org_where["org_level"] = "team";
            }

            //조직 정보를 where 조건에 추가
            let org_ccorg = orgInfo.org_ccorg_cd;
            let org_col_nm_name = orgInfo['org_name'];
            let org_ccorg_col = org_col_nm.split('_', 1) + '_ccorg_cd';
            let search_org, search_org_name, search_org_ccorg;
            if (org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id') {
                search_org = 'div_id';
                search_org_name = 'div_name';
                search_org_ccorg = 'div_ccorg_cd';
            } else if (org_col_nm === 'div_id') {
                search_org = 'hdqt_id';
                search_org_name = 'hdqt_name';
                search_org_ccorg = 'hdqt_ccorg_cd';
            } else if (org_col_nm === 'hdqt_id' || org_col_nm === 'team_id') {
                search_org = 'team_id';
                search_org_name = 'team_name';
                search_org_ccorg = 'team_ccorg_cd';
            } else { return; };

            const org_query = await SELECT.from(org_full_level).orderBy('org_order');
            let org_query_data = [];
            org_query.forEach(data=>{
                if(data[org_col_nm] === org_id && data.org_tp === 'delivery'){
                    org_query_data.push(data)
                };
            })

            // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
            let pl_column = org_col_nm === 'div_id' ? [...pl_col_list, 'hdqt_id as id', 'hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_col_list, 'team_id as id', 'team_name as name'] : [...pl_col_list, 'div_id as id', 'div_name as name'];
            let pl_where = org_col_nm.includes('lv1') ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            let pl_groupBy = org_col_nm === 'div_id' ? [...pl_groupBy_cols, 'hdqt_id', 'hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_groupBy_cols, 'team_id', 'team_name'] : [...pl_groupBy_cols, 'div_id', 'div_name'];

            let sga_column = org_col_nm === 'div_id' ? [...sga_col_list, 'hdqt_id as id', 'hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...sga_col_list, 'team_id as id', 'team_name as name'] : [...sga_col_list, 'div_id as id', 'div_name as name'];
            let sga_where = org_col_nm.includes('lv1') ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id };
            let sga_groupBy = org_col_nm === 'div_id' ? [...sga_groupBy_cols, 'hdqt_id', 'hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...sga_groupBy_cols, 'team_id', 'team_name'] : [...sga_groupBy_cols, 'div_id', 'div_name'];

            let rsp_column = org_col_nm === 'div_id' ? [...rsp_col_list, 'hdqt_id as id', 'hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...rsp_col_list, 'team_id as id', 'team_name as name'] : [...rsp_col_list, 'div_id as id', 'div_name as name'];
            let rsp_where = rsp_where_conditions
            let rsp_groupBy = org_col_nm === 'div_id' ? [...rsp_groupBy_cols, 'hdqt_id', 'hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...rsp_groupBy_cols, 'team_id', 'team_name'] : [...rsp_groupBy_cols, 'div_id', 'div_name'];

            // DB 쿼리 실행 (병렬)
            const [target_query, pl_data, account_pl_data, sga_data, rsp_data] = await Promise.all([
                get_org_target(year, ['A04','A06','C04']),
                SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(account_pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
                SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy)
            ]);
            let target_data = target_query.filter(data=>data[org_ccorg_col] === org_ccorg);
            
            if(!pl_data.length && !sga_data.length && !account_pl_data.length){
                //return req.res.status(204).send();
                return []
            }

            //ackerton 로직
            let ackerton_list = [];
            let ac_map = [];
            let ackerton_org;
            let o_data = {}
            if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                ackerton_org = org_query.find(data=>data.org_ccorg_cd === '610000');
                org_query.forEach(data=>{
                    if (!ackerton_list.find(data2 => data2.id === data[search_org]) && data[search_org] && data['lv3_ccorg_cd'] === '610000') {
                        let oTemp = {
                            id: data[search_org],
                            name: data[search_org_name],
                            ccorg: data[search_org_ccorg],
                            org_order: data['org_order'],
                            lv3_ccorg_cd : data['lv3_ccorg_cd']
                        };
                        ac_map.push(data[search_org])
                        ackerton_list.push(oTemp);
                    };
                });
                
                pl_where = { ...pl_where, 'lv3_ccorg_cd' : '610000' };
                sga_where = { ...sga_where, 'lv3_ccorg_cd' : '610000' };
                rsp_where = { ...rsp_where, 'lv3_ccorg_cd' : '610000' };

                const [ackerton_pl_data, ackerton_sga_data, ackerton_rsp_data] = await Promise.all([
                    SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                    SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
                    SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy)
                ]);

                const o_curr_target = target_data.find(o_target => o_target.org_id === ackerton_org.org_id)

                o_data[ackerton_org.org_id]={ 
                    id: ackerton_org.org_id, 
                    name: ackerton_org.org_name, 
                    curr_target: (o_curr_target?.target_total_labor ?? 0) !== 0 ? (o_curr_target?.target_cont_profit ?? 0) / (o_curr_target?.target_total_labor) : 0, 
                    curr_margin: 0,
                    last_margin: 0,
                    last_margin_sum: 0,
                    curr_total_year_amt: 0,
                    last_total_year_amt: 0,
                    last_year_total_year_amt: 0,
                    curr_amount_sum: 0,
                    last_amount_sum: 0,
                    last_amount_total_sum: 0
                };
                ackerton_pl_data.forEach(o_pl => {
                    if (o_pl.year === year) {
                        o_data[ackerton_org.org_id]['curr_margin'] += (o_pl?.margin_amount_sum ?? 0)
                    } else if (o_pl.year === last_year) {
                        o_data[ackerton_org.org_id]['last_margin'] += (o_pl?.margin_amount_sum ?? 0)
                        o_data[ackerton_org.org_id]['last_margin_sum'] += (o_pl?.margin_total_amount_sum ?? 0)
                    }
                })
                ackerton_rsp_data.forEach(o_rsp => {
                    if (o_rsp.year === year) {
                        o_data[ackerton_org.org_id]['curr_total_year_amt'] += (o_rsp?.total_year_amt ?? 0)
                    } else if (o_rsp.year === last_year) {
                        o_data[ackerton_org.org_id]['last_total_year_amt'] += (o_rsp?.total_year_amt ?? 0)
                        o_data[ackerton_org.org_id]['last_year_total_year_amt'] += (o_rsp?.total_amt_year_sum ?? 0)
                    } 
                })
                ackerton_sga_data.forEach(o_sga => {
                    if (o_sga.year === year) {
                        o_data[ackerton_org.org_id]['curr_amount_sum'] += (o_sga?.amount_sum ?? 0)
                    } else if (o_sga.year === last_year) {
                        o_data[ackerton_org.org_id]['last_amount_sum'] += (o_sga?.amount_sum ?? 0)
                        o_data[ackerton_org.org_id]['last_amount_total_sum'] += (o_sga?.amount_total_sum ?? 0)
                    }
                })
            };

            //조직 리스트
            let org_list = [];
            org_query_data.forEach(data => {
                if (!org_list.find(data2 => data2.id === data[search_org]) && data[search_org]) {
                    let oTemp = {
                        id: data[search_org],
                        name: data[search_org_name],
                        ccorg: data[search_org_ccorg],
                        org_order: data['org_order'],
                        org_tp: data['org_tp'],
                        lv3_ccorg_cd : data['lv3_ccorg_cd']
                    };
                    
                    if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                        if(!ackerton_list.find(data3 => data3.ccorg === oTemp.ccorg)){
                            org_list.push(oTemp);
                        };
                    }else{
                        org_list.push(oTemp);
                    }
                };
            });

            if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                let oTemp = {
                    id: ackerton_org.org_id,
                    name: ackerton_org.org_name,
                    ccorg: ackerton_org.org_ccorg_cd,
                    org_order: ackerton_org.org_order,
                    org_tp: ackerton_org.org_tp,
                    lv3_ccorg_cd : ackerton_org.lv3_ccorg_cd
                };
                org_list.push(oTemp);
            };

            let a_curr_target = target_data;
            if(pl_data.length > 0){
                pl_data.forEach(o_pl => {
                    if(!ac_map.includes(o_pl['id'])){
                        if (!o_data[`${o_pl.id}`]) {
                            const o_curr_target = a_curr_target.find(o_target => o_target.org_id === o_pl.id)
                            o_data[`${o_pl.id}`] = { id: o_pl.id, name: o_pl.name, curr_target: o_curr_target?.target_rohc ?? 0}
                        }
                        if (o_pl.year === year) {
                            o_data[`${o_pl.id}`]['curr_margin'] = (o_pl?.margin_amount_sum ?? 0)
                        } else if (o_pl.year === last_year) {
                            o_data[`${o_pl.id}`]['last_margin'] = (o_pl?.margin_amount_sum ?? 0)
                            o_data[`${o_pl.id}`]['last_margin_sum'] = (o_pl?.margin_total_amount_sum ?? 0)
                        }
                    };
                })
            }
            
            if(orgInfo.org_level !== 'lv1' && orgInfo.org_level !== 'lv2'){
                console.log(1)
                if(account_pl_data.length > 0){
                    if((org_col_nm !== 'lv1_id' || org_col_nm !== 'lv2_id') && orgInfo.lv3_ccorg_cd === '237100' || orgInfo.org_tp === 'account'){
                        account_pl_data.forEach(o_acc_pl => {
                            if(!ac_map.includes(o_acc_pl['id'])){
                                if (!o_data[`${o_acc_pl.id}`]) {
                                    const o_curr_target = a_curr_target.find(o_target => o_target.org_id === o_acc_pl.id)
                                    o_data[`${o_acc_pl.id}`] = { id: o_acc_pl.id, name: o_acc_pl.name, curr_target: o_curr_target?.target_rohc ?? 0 }
                                }
                                if (o_acc_pl.year === year) {
                                    o_data[`${o_acc_pl.id}`]['curr_margin'] = (o_acc_pl?.margin_amount_sum ?? 0)
                                } else if (o_acc_pl.year === last_year) {
                                    o_data[`${o_acc_pl.id}`]['last_margin'] = (o_acc_pl?.margin_amount_sum ?? 0)
                                    o_data[`${o_acc_pl.id}`]['last_margin_sum'] = (o_acc_pl?.margin_total_amount_sum ?? 0)
                                }
                            }
                        })
                    }
                }
            }
            

            if(rsp_data.length > 0){
                rsp_data.forEach(o_rsp => {
                    if(!ac_map.includes(o_rsp['id'])){
                        if (!o_data[`${o_rsp.id}`]) {
                            const o_curr_target = a_curr_target.find(o_target => o_target.org_id === o_rsp.id)
                            o_data[`${o_rsp.id}`] = { id: o_rsp.id, name: o_rsp.name, curr_target: o_curr_target?.target_rohc ?? 0}
                        }
                        if (o_rsp.year === year) {
                            o_data[`${o_rsp.id}`]['curr_total_year_amt'] = (o_rsp?.total_year_amt ?? 0)
                        } else if (o_rsp.year === last_year) {
                            o_data[`${o_rsp.id}`]['last_total_year_amt'] = (o_rsp?.total_year_amt ?? 0)
                            o_data[`${o_rsp.id}`]['last_year_total_year_amt'] = (o_rsp?.total_amt_year_sum ?? 0)
                        } 
                    }
                })
            }

            if(sga_data.length > 0){
                sga_data.forEach(o_sga => {
                    if(!ac_map.includes(o_sga['id'])){
                        if (!o_data[`${o_sga.id}`]) {
                            const o_curr_target = a_curr_target.find(o_target => o_target.org_id === o_sga.id)
                            o_data[`${o_sga.id}`] = { id: o_sga.id, name: o_sga.name, curr_target: o_curr_target?.target_rohc ?? 0 }
                        }
                        if (o_sga.year === year) {
                            o_data[`${o_sga.id}`]['curr_amount_sum'] = (o_sga?.amount_sum ?? 0)
                        } else if (o_sga.year === last_year) {
                            o_data[`${o_sga.id}`]['last_amount_sum'] = (o_sga?.amount_sum ?? 0)
                            o_data[`${o_sga.id}`]['last_amount_total_sum'] = (o_sga?.amount_total_sum ?? 0)
                        }
                    }
                })
            }

            // 합계 로직
            let a_data = Object.values(o_data);
            let o_total = { "display_order": 0, "org_id": 'total', "org_name": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계' };
            let org_data = [];
            org_list.forEach((data) => {
                let o_rohc_data = a_data.find(o_data => o_data.id === data.id);
                if (o_rohc_data) {
                    org_data.push({
                        "display_order": data.org_order,
                        "org_id": data.id,
                        "org_name": data.name,
                        "target_curr_y_value": o_rohc_data?.curr_target ?? 0,
                        "actual_curr_ym_value": (o_rohc_data?.curr_total_year_amt ?? 0) === 0 ? 0 : ((o_rohc_data?.curr_margin ?? 0) - (o_rohc_data?.curr_amount_sum ?? 0)) / o_rohc_data.curr_total_year_amt,
                        "actual_last_ym_value": (o_rohc_data?.last_total_year_amt ?? 0) === 0 ? 0 : ((o_rohc_data?.last_margin ?? 0) - (o_rohc_data?.last_amount_sum ?? 0)) / o_rohc_data.last_total_year_amt,
                        "actual_curr_ym_rate": (o_rohc_data?.curr_target ?? 0) === 0 || (o_rohc_data?.curr_total_year_amt ?? 0) === 0 ? 0 : (((o_rohc_data?.curr_margin ?? 0) - (o_rohc_data?.curr_amount_sum ?? 0)) / o_rohc_data.curr_total_year_amt) / (o_rohc_data.curr_target),
                        "actual_last_ym_rate": (o_rohc_data?.last_year_total_year_amt ?? 0) === 0 || (o_rohc_data?.last_total_year_amt ?? 0) === 0 ? 0 : (((o_rohc_data?.last_margin ?? 0) - (o_rohc_data?.last_amount_sum ?? 0)) / o_rohc_data.last_total_year_amt) / (((o_rohc_data?.last_margin_sum ?? 0) - (o_rohc_data?.last_amount_total_sum ?? 0)) / o_rohc_data.last_year_total_year_amt),
                        "actual_curr_ym_value_gap": ((o_rohc_data?.curr_total_year_amt ?? 0) === 0 ? 0 : ((o_rohc_data?.curr_margin ?? 0) - (o_rohc_data?.curr_amount_sum ?? 0)) / o_rohc_data.curr_total_year_amt) - ((o_rohc_data?.last_total_year_amt ?? 0) === 0 ? 0 : ((o_rohc_data?.last_margin ?? 0) - (o_rohc_data?.last_amount_sum ?? 0)) / o_rohc_data.last_total_year_amt),
                        "actual_curr_ym_rate_gap": ((o_rohc_data?.curr_target ?? 0) === 0 || (o_rohc_data?.curr_total_year_amt ?? 0) === 0 ? 0 : (((o_rohc_data?.curr_margin ?? 0) - (o_rohc_data?.curr_amount_sum ?? 0)) / o_rohc_data.curr_total_year_amt) / (o_rohc_data.curr_target)) - ((o_rohc_data?.last_year_total_year_amt ?? 0) === 0 || (o_rohc_data?.last_total_year_amt ?? 0) === 0 ? 0 : (((o_rohc_data?.last_margin ?? 0) - (o_rohc_data?.last_amount_sum ?? 0)) / o_rohc_data.last_total_year_amt) / (((o_rohc_data?.last_margin_sum ?? 0) - (o_rohc_data?.last_amount_total_sum ?? 0)) / o_rohc_data.last_year_total_year_amt))
                    });
                }
            });

            let actual_curr_total_margin = pl_data.reduce((iSum, oData) => {
                if (oData.year == year) {
                    iSum += parseInt(oData.margin_amount_sum)
                }
                return iSum;
            }, 0);

            let actual_last_total_margin = pl_data.reduce((iSum, oData) => {
                if (oData.year == last_year) {
                    iSum += parseInt(oData.margin_amount_sum)
                }
                return iSum;
            }, 0);

            let actual_last_total_margin_sum = pl_data.reduce((iSum, oData) => {
                if (oData.year == last_year) {
                    iSum += parseInt(oData.margin_total_amount_sum)
                }
                return iSum;
            }, 0);

            if(orgInfo.lv3_ccorg_cd === '237100'){
                actual_curr_total_margin = 0;
                actual_last_total_margin = 0;
                actual_last_total_margin_sum = 0;
            }
            
            if(orgInfo.org_level !== 'lv1' && orgInfo.org_level !== 'lv2'){
                let actual_curr_acc_total_margin = account_pl_data.reduce((iSum, oData) => {
                    if (oData.year == year) {
                        iSum += parseInt(oData.margin_amount_sum)
                    }
                    return iSum;
                }, 0);
                actual_curr_total_margin += (actual_curr_acc_total_margin ?? 0);

                let actual_last_acc_total_margin = account_pl_data.reduce((iSum, oData) => {
                    if (oData.year == last_year) {
                        iSum += parseInt(oData.margin_amount_sum)
                    }
                    return iSum;
                }, 0);
                actual_last_total_margin += (actual_last_acc_total_margin ?? 0);

                let actual_last_acc_total_margin_sum = account_pl_data.reduce((iSum, oData) => {
                    if (oData.year == last_year) {
                        iSum += parseInt(oData.margin_total_amount_sum)
                    }
                    return iSum;
                }, 0);
                actual_last_total_margin_sum += (actual_last_acc_total_margin_sum ?? 0);
            }

            let actual_curr_total_sga = sga_data.reduce((iSum, oData) => {
                if (oData.year == year) {
                    iSum += parseInt(oData.amount_sum)
                }
                return iSum;
            }, 0);

            let actual_last_total_sga = sga_data.reduce((iSum, oData) => {
                if (oData.year == last_year) {
                    iSum += parseInt(oData.amount_sum)
                }
                return iSum;
            }, 0);

            let actual_last_total_sga_sum = sga_data.reduce((iSum, oData) => {
                if (oData.year == last_year) {
                    iSum += parseInt(oData.amount_total_sum)
                }
                return iSum;
            }, 0);

            let actual_curr_total_rsp = rsp_data.reduce((iSum, oData) => {
                if (oData.year == year) {
                    iSum += parseInt(oData.total_year_amt)
                }
                return iSum;
            }, 0);

            let actual_last_total_rsp = rsp_data.reduce((iSum, oData) => {
                if (oData.year == last_year) {
                    iSum += parseInt(oData.total_year_amt)
                }
                return iSum;
            }, 0);

            let actual_last_total_rsp_sum = rsp_data.reduce((iSum, oData) => {
                if (oData.year == last_year) {
                    iSum += parseInt(oData.total_amt_year_sum)
                }
                return iSum;
            }, 0);

            o_total['actual_curr_ym_value'] = (actual_curr_total_rsp ?? 0) === 0 ? 0 : ((actual_curr_total_margin ?? 0) - (actual_curr_total_sga ?? 0)) / actual_curr_total_rsp;
            o_total['actual_last_ym_value'] = (actual_last_total_rsp ?? 0) === 0 ? 0 : ((actual_last_total_margin ?? 0) - (actual_last_total_sga ?? 0)) / actual_last_total_rsp;
            const o_curr_target = a_curr_target.find(o_target => o_target.org_id === org_id)

            o_total['target_curr_y_value'] = (o_curr_target?.target_rohc ?? 0);
            o_total['actual_curr_ym_rate'] = o_total['target_curr_y_value'] === 0 ? 0 : o_total['actual_curr_ym_value'] / o_total['target_curr_y_value'];
            o_total['actual_last_ym_rate'] = (actual_last_total_rsp_sum ?? 0) === 0 || (actual_last_total_rsp ?? 0) === 0 ? 0 : (((actual_last_total_margin ?? 0) - (actual_last_total_sga ?? 0)) / actual_last_total_rsp) / (((actual_last_total_margin_sum ?? 0) - (actual_last_total_sga_sum ?? 0)) / actual_last_total_rsp_sum);
            o_total['actual_curr_ym_value_gap'] = o_total['actual_curr_ym_value'] - o_total['actual_last_ym_value']
            o_total['actual_curr_ym_rate_gap'] = o_total['actual_curr_ym_rate'] - o_total['actual_last_ym_rate']

            let o_result_total = {
                "display_order": o_total['display_order'],
                "org_id": o_total['org_id'],
                "org_name": o_total['org_name'],
                "target_curr_y_value": o_total['target_curr_y_value'],
                "actual_curr_ym_value": o_total['actual_curr_ym_value'],
                "actual_last_ym_value": o_total['actual_last_ym_value'],
                "actual_curr_ym_rate": o_total['actual_curr_ym_rate'],
                "actual_last_ym_rate": o_total['actual_last_ym_rate'],
                "actual_curr_ym_value_gap": o_total['actual_curr_ym_value_gap'],
                "actual_curr_ym_rate_gap": o_total['actual_curr_ym_rate_gap']
            }
            
            oResult.push(o_result_total);
            if(org_col_nm !== 'hdqt_id' && org_col_nm !== 'team_id'){
                oResult.push(...org_data);
            }

            // display_order 순으로 최종 정렬
            let aSortFields = [
                { field: "display_order", order: "asc" },
            ];
            oResult.sort((oItem1, oItem2) => {
                for (const { field, order } of aSortFields) {
                    // 필드가 null일 때
                    if (oItem1[field] === null && oItem2[field] !== null) return -1;
                    if (oItem1[field] !== null && oItem2[field] === null) return 1;
                    if (oItem1[field] === null && oItem2[field] === null) continue;

                    if (typeof oItem1[field] === "string") {    // 문자일 때 localeCompare
                        var iResult = oItem1[field].localeCompare(oItem2[field]);
                    } else if (typeof oItem1[field] === "number") { // 숫자일 때
                        var iResult = oItem1[field] - oItem2[field];
                    }

                    if (iResult !== 0) {
                        return (order === "asc") ? iResult : -iResult;
                    }
                }
                return 0;
            })

            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}