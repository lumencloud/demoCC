module.exports = (srv) => {
    srv.on('get_actual_sale_org_pl', async (req) => {

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

        //목표값
        const target_view = db.entities('common').org_target_sum_view;
        // =================================================================================

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

        let i_month = Number(month);
        let sale_sum_col, margin_sum_col;
        for(let i = 1 ; i <= i_month; i++){
            if(!sale_sum_col){
                sale_sum_col = `sum(ifnull(sale_m${i}_amt,0))`
                margin_sum_col = `sum(ifnull(margin_m${i}_amt,0))`
            }else{
                sale_sum_col += ` + sum(ifnull(sale_m${i}_amt,0))`
                margin_sum_col += ` + sum(ifnull(margin_m${i}_amt,0))`
            };
        };
        sale_sum_col += ` as sale_amount_sum`;
        margin_sum_col += ` as margin_amount_sum`;

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
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', "lv1_name","lv2_name","lv3_name","div_name","hdqt_name","team_name"]).where({ 'org_id': org_id });

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        let org_col_nm_name = orgInfo[org_col_nm.split('_',1) + '_name'];
        let org_ccorg = orgInfo.org_ccorg_cd;
        let org_ccorg_col = org_col_nm.split('_',1) + '_ccorg_cd';
        let search_org, search_org_nm, search_org_ccorg, target_where;

        const pl_col_list = ['year', sale_sum_col, margin_sum_col];
        const target_col = ['org_id', 'target_year', 'org_name', 'target_sale_amt', 'target_margin_rate'];
        const target_ent_where = {'total' : true, 'target_year': { in: [year, last_year] }};
        if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id'){
            search_org = 'div_id';
            search_org_nm = 'div_name';
            search_org_ccorg = 'div_ccorg_cd';
            let aAddList = [search_org, search_org_nm];
            pl_col_list.push(...aAddList);
            target_where =  {'total' : false, 'target_year': { in: [year, last_year] }, [org_ccorg_col] : org_ccorg, 'div_ccorg_cd' : {'!=':null}, 'hdqt_ccorg_cd' : null };
        }else if(org_col_nm === 'div_id'){
            search_org = 'hdqt_id';
            search_org_nm = 'hdqt_name';
            search_org_ccorg = 'hdqt_ccorg_cd';
            let aAddList = [search_org, search_org_nm];
            pl_col_list.push(...aAddList);
            target_where =  {'total' : false, 'target_year': { in: [year, last_year] }, [org_ccorg_col] : org_ccorg };
        }else if(org_col_nm === 'hdqt_id'){
            search_org = 'team_id';
            search_org_nm = 'team_name';
            search_org_ccorg = 'team_ccorg_cd';
            let aAddList = [search_org, search_org_nm];
            pl_col_list.push(...aAddList);
            target_where =  {'total' : false, 'target_year': { in: [year, last_year] }, [org_ccorg_col] : org_ccorg };
        }else{return;};

        const org_query = await SELECT.from(org_full_level).columns([search_org, search_org_nm, search_org_ccorg, 'org_order']).where({ [org_col_nm]: org_id }).orderBy('org_order');

        //조직 리스트
        let org_list = [];
        org_query.forEach(data=>{
            if(!org_list.find(data2=>data2.id === data[search_org]) && data[search_org]){
                let oTemp = {
                    id : data[search_org],
                    name : data[search_org_nm],
                    ccorg : data[search_org_ccorg],
                    org_order : data['org_order']
                };
                org_list.push(oTemp);
            };
        });

        /**
         * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const pl_where_conditions = { 'year': { in: [year, last_year] } };
        let pl_where =  org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
        const pl_groupBy_cols = ['year', search_org, search_org_nm];

        // DB 쿼리 실행 (병렬)
        let pl_data, target_data, target_ent_data;
        if(org_col_nm === 'lv1_id'){
            [pl_data, target_data, target_ent_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols),
                SELECT.from(target_view).columns(target_col).where(target_where),
                SELECT.from(target_view).columns(target_col).where(target_ent_where)
            ]);
        }else{
            [pl_data, target_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols),
                SELECT.from(target_view).columns(target_col).where(target_where)
            ]);
        }
        
        // pl_data 결과 값 flat 하게 데이터 구성
        let flat_pl = pl_data.reduce((acc, item) =>{
            let main = item[search_org];
            let sub = item['year'];
            let rest = {...item};
            delete rest[search_org];
            delete rest['year'];
            Object.entries(rest).forEach(([key, value])=>{
                acc[`_${main}_${sub}_${key}`] = value;
            });
            return acc;
        }, {});

        // pl_data 결과 값 flat 하게 데이터 구성
        let flat_target = target_data.reduce((acc, item) =>{
            let main = item['org_id'];
            let sub = item['target_year'];
            let rest = {...item};
            delete rest['org_id'];
            delete rest['target_year'];
            Object.entries(rest).forEach(([key, value])=>{
                acc[`_${main}_${sub}_${key}`] = value;
            });
            return acc;
        }, {});

        let i_count = 0
        let total_data = [
            {
                "display_order": i_count,
                "org_id": "total",
                "org_nm": '합계',
                "type": '매출',
                "target_curr_y_value": org_col_nm === 'lv1_id' ? Number(target_ent_data?.[0]?.target_sale_amt ?? 0) : 0,
                "actual_curr_ym_value": 0,
                "actual_last_ym_value": 0,
                "actual_curr_ym_rate": 0,
                "actual_last_ym_rate": 0,
            },
            {
                "display_order": ++i_count,
                "org_id": "total",
                "org_nm": '합계',
                "type": '마진',
                "target_curr_y_value": org_col_nm === 'lv1_id' ? (Number((target_ent_data?.[0]?.target_sale_amt ?? 0)) * Number((target_ent_data?.[0]?.target_margin_rate ?? 0)) / 100) : 0,
                "actual_curr_ym_value": 0,
                "actual_last_ym_value": 0,
                "actual_curr_ym_rate": 0,
                "actual_last_ym_rate": 0,
            },
            {
                "display_order": ++i_count,
                "org_id": "total",
                "org_nm": '합계',
                "type": '마진률',
                "target_curr_y_value": org_col_nm === 'lv1_id' ? Number((target_ent_data?.[0]?.target_margin_rate ?? 0)) : 0,
                "actual_curr_ym_value": 0,
                "actual_last_ym_value": 0,
                "actual_curr_ym_rate": 0,
                "actual_last_ym_rate": 0,
            }
        ];

        let org_data = [];
        org_list.forEach(data=>{
            let sale_data =
                {
                    "display_order": ++i_count,
                    "org_id": data.id,
                    "org_nm": data.name,
                    "type": "매출",
                    "target_curr_y_value": Number((flat_target?.[`_${data.id}_${year}_target_sale_amt`] ?? 0)),
                    "actual_curr_ym_value": flat_pl?.[`_${data.id}_${year}_sale_amount_sum`] ?? 0,
                    "actual_last_ym_value": flat_pl?.[`_${data.id}_${last_year}_sale_amount_sum`] ?? 0,
                    "actual_curr_ym_rate": Number((flat_target?.[`_${data.id}_${year}_target_sale_amt`] ?? 0)) === 0 ? 0 : (flat_pl?.[`_${data.id}_${year}_sale_amount_sum`] ?? 0) / (Number((flat_target?.[`_${data.id}_${year}_target_sale_amt`] ?? 0))*100000000) * 100,
                    "actual_last_ym_rate": Number((flat_target?.[`_${data.id}_${last_year}_target_sale_amt`] ?? 0)) === 0 ? 0 : (flat_pl?.[`_${data.id}_${last_year}_sale_amount_sum`] ?? 0) / Number((flat_target?.[`_${data.id}_${last_year}_target_sale_amt`] ?? 0)) * 100,
                };
                
            let margin_target_curr = (Number((flat_target?.[`_${data.id}_${year}_target_margin_rate`] ?? 0)) * Number((flat_target?.[`_${data.id}_${year}_target_sale_amt`] ?? 0))) / 100
            let margin_target_last = (Number((flat_target?.[`_${data.id}_${last_year}_target_margin_rate`] ?? 0)) * Number((flat_target?.[`_${data.id}_${last_year}_target_sale_amt`] ?? 0))) / 100
            let margin_data =
                {
                    "display_order": ++i_count,
                    "org_id": data.id,
                    "org_nm": data.name,
                    "type": "마진",
                    "target_curr_y_value": margin_target_curr,
                    "actual_curr_ym_value": flat_pl?.[`_${data.id}_${year}_margin_amount_sum`] ?? 0,
                    "actual_last_ym_value": flat_pl?.[`_${data.id}_${last_year}_margin_amount_sum`] ?? 0,
                    "actual_curr_ym_rate": margin_target_curr === 0 ? 0 : (flat_pl?.[`_${data.id}_${year}_margin_amount_sum`] ?? 0) / (margin_target_curr * 100000000) * 100,
                    "actual_last_ym_rate": margin_target_last === 0 ? 0 : (flat_pl?.[`_${data.id}_${last_year}_margin_amount_sum`] ?? 0) / (margin_target_last * 100000000) * 100,
                };

            let margin_rate_curr = (flat_pl?.[`_${data.id}_${year}_sale_amount_sum`] ?? 0) === 0 ? 0 : (flat_pl?.[`_${data.id}_${year}_margin_amount_sum`] ?? 0) / (flat_pl?.[`_${data.id}_${year}_sale_amount_sum`] ?? 0) * 100;
            let margin_rate_last = (flat_pl?.[`_${data.id}_${last_year}_sale_amount_sum`] ?? 0) === 0 ? 0 : (flat_pl?.[`_${data.id}_${last_year}_margin_amount_sum`] ?? 0) / (flat_pl?.[`_${data.id}_${last_year}_sale_amount_sum`] ?? 0) * 100;
            let margin_rate_data =
                {
                    "display_order": ++i_count,
                    "org_id": data.id,
                    "org_nm": data.name,
                    "type": "마진률",
                    "target_curr_y_value": Number(flat_target?.[`_${data.id}_${year}_target_margin_rate`] ?? 0),
                    "actual_curr_ym_value": margin_rate_curr,
                    "actual_last_ym_value": margin_rate_last,
                    "actual_curr_ym_rate": (Number(flat_target?.[`_${data.id}_${year}_target_margin_rate`] ?? 0)) === 0 ? 0 : margin_rate_curr / (Number(flat_target?.[`_${data.id}_${year}_target_margin_rate`] ?? 0)) * 100,
                    "actual_last_ym_rate": (Number(flat_target?.[`_${data.id}_${last_year}_target_margin_rate`] ?? 0)) === 0 ? 0 : margin_rate_last / (Number(flat_target?.[`_${data.id}_${last_year}_target_margin_rate`] ?? 0)) * 100,
                };

            org_data.push(sale_data,margin_data,margin_rate_data);

            total_data[0].actual_curr_ym_value += sale_data.actual_curr_ym_value;
            total_data[0].actual_last_ym_value += sale_data.actual_last_ym_value;
            total_data[1].actual_curr_ym_value += margin_data.actual_curr_ym_value;
            total_data[1].actual_last_ym_value += margin_data.actual_last_ym_value;

            if(org_col_nm !== 'lv1_id'){
                total_data[0].target_curr_y_value += sale_data.target_curr_y_value;
                total_data[1].target_curr_y_value += margin_data.target_curr_y_value;
            };
        });

        if(org_col_nm !== 'lv1_id'){
            total_data[2].target_curr_y_value = total_data[0].target_curr_y_value === 0 ? 0 : total_data[1].target_curr_y_value / total_data[0].target_curr_y_value * 100;
        };
        total_data.forEach(data=>{
            data.actual_curr_ym_rate = (data?.target_curr_y_value ?? 0) === 0 ? 0 : (data?.actual_curr_ym_value ?? 0) / ((data?.target_curr_y_value ?? 0) *100000000) * 100;
            data.actual_last_ym_rate = (data?.target_last_y_value ?? 0) === 0 ? 0 : (data?.actual_last_ym_value ?? 0) / ((data?.target_last_y_value ?? 0) *100000000) * 100;
        });

        oResult.push(...total_data, ...org_data)
        return oResult
    });
}