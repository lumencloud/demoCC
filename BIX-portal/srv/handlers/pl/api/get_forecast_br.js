module.exports = (srv) => {
    srv.on('get_forecast_br', async (req) => {

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
         * target [목표]
         * [부문/본부/팀 + 년,금액] 조직 별 연단위 목표금액
         */
        const target = db.entities('common').target_view;
        /**
         * rsp.wideview_unpivot_view [비용 집계]
         * [부문/본부/팀 + 년,month_amt,금액] 프로젝트 비용 집계 뷰
         */
        const rsp_view = db.entities('rsp').wideview_unpivot_view;
        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;
        // =================================================================================

        // function 입력 파라미터
        const { year, month, org_id } = req.data;

        // QUERY 공통 파라미터 선언

        /** 
         * 타겟 뷰 조회용 컬럼
         */
        const target_col_list = [
            'year', 'org_id','div_id','hdqt_id','team_id','sum(ifnull(br_target,0)) as br_target'];
        const target_where_conditions = {'is_total' : true, 'year': year, 'is_delivery':true};
        const target_groupBy_cols = ['year', 'org_id','div_id','hdqt_id','team_id']

        // rsp 조회용 정보
        const rsp_col_list = ['month_amt', 'org_id', 'ccorg_cd','div_id','hdqt_id','team_id','div_name','hdqt_name','team_name', 'sum(ifnull(total_amt_sum,0)) as total_amt_sum', 'sum(ifnull(bill_amt_sum,0)) as bill_amt_sum'];
        const rsp_where_conditions = { 'year': year, 'is_delivery': true, 'team_id':{'!=':null} };
        const rsp_groupBy_cols = ['month_amt', 'org_id', 'ccorg_cd','div_id','hdqt_id','team_id','div_name','hdqt_name','team_name'];

        /**
         * +++++ TBD +++++
         * 권한 체크하여 사용자가 조회 가능한 조직인지 판별 후 코드 진행
         */

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
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd'])
            .where({ 'org_id': org_id });

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        // ccorg_cd 만 가지고 있는 경우 조회조건으로 사용
        let org_ccorg_col_nm = org_col_nm.slice(0, -2) + 'ccorg_cd'; // <>_id 에서 id 제거 후 <>_ccorg_cd 컬럼명 생성
        let org_ccorg_cd = orgInfo.org_ccorg_cd;

        // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
        let target_column = target_col_list;
        let target_where = org_col_nm === 'lv1_id' ? target_where_conditions : { ...target_where_conditions, [org_col_nm]: org_id };
        let target_groupBy = target_groupBy_cols;
        
        
        let rsp_column = rsp_col_list;
        let rsp_where = { ...rsp_where_conditions, [org_ccorg_col_nm]: org_ccorg_cd, and :{'hdqt_id':{'!=': null}, and :{'div_id':{'!=': null}}}};
        let rsp_groupBy = rsp_groupBy_cols;
        // DB 쿼리 실행 (병렬)
        const [rsp_data, target_data] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
            SELECT.from(target).columns(target_column).where(target_where).groupBy(...target_groupBy),
        ]);
        
        let o_data ={sum:{},team:{}}
        
        rsp_data.forEach(o_rsp =>{
            
            if(!o_data['sum'][`${o_rsp.div_id}`]){
                let o_target = target_data.find(o_find => o_find.div_id === o_rsp.div_id);
                o_data['sum'][`${o_rsp.div_id}`]={
                    'ccorg_cd': o_rsp.ccorg_cd,
                    'div_id': o_rsp.div_id,
                    'div_name': `소계 : ${o_rsp.div_name}`,
                    'hdqt_id': o_rsp.div_id,
                    'hdqt_name': `소계 : ${o_rsp.div_name}`,
                    'team_id': o_rsp.div_id,
                    'team_name': `소계 : ${o_rsp.div_name}`,
                    'target': o_target?. br_target ?? 0,
                }
            }
            if(!o_data['sum'][`${o_rsp.hdqt_id}`]){
                let o_target = target_data.find(o_find => o_find.hdqt_id === o_rsp.hdqt_id);
                o_data['sum'][`${o_rsp.hdqt_id}`]={
                    'ccorg_cd': o_rsp.ccorg_cd,
                    'div_id': o_rsp.div_id,
                    'div_name': o_rsp.div_name,
                    'hdqt_id': o_rsp.hdqt_id,
                    'hdqt_name': `소계 : ${o_rsp.hdqt_name}`,
                    'team_id': o_rsp.hdqt_id,
                    'team_name': `소계 : ${o_rsp.hdqt_name}`,
                    'target': o_target?. br_target ?? 0,
                }
            }
            let month_rsp = rsp_data.find(o_find => o_find.org_id === o_rsp.org_id && o_find.month_amt === month)
            let m_12_rsp = rsp_data.find(o_find => o_find.org_id === o_rsp.org_id && o_find.month_amt === '12')
            if(!o_data['team'][`${o_rsp.team_id}`]){
                o_data['team'][`${o_rsp.team_id}`] = {
                    'ccorg_cd': o_rsp.ccorg_cd,
                    'div_id': o_rsp.div_id,
                    'div_name': o_rsp.div_name,
                    'hdqt_id': o_rsp.hdqt_id,
                    'hdqt_name': o_rsp.hdqt_name,
                    'team_id': o_rsp.team_id,
                    'team_name': o_rsp.team_name,
                    'forecast_value': (m_12_rsp?.total_amt_sum ?? 0) === 0 ? 0 :(m_12_rsp?.bill_amt_sum ?? 0)/m_12_rsp.total_amt_sum*100,
                    'secured_value': (month_rsp?.total_amt_sum ?? 0) === 0 ? 0 :(month_rsp?.bill_amt_sum ?? 0)/month_rsp.total_amt_sum*100,
                    'not_secured_value': ((m_12_rsp?.total_amt_sum ?? 0) - (month_rsp?.total_amt_sum ?? 0)) === 0 ? 0 :((m_12_rsp?.bill_amt_sum ?? 0) - (month_rsp?.bill_amt_sum ?? 0))/((m_12_rsp?.total_amt_sum ?? 0) - (month_rsp?.total_amt_sum ?? 0))*100,
                    'target': 0,
                }
            }
            o_data['sum'][`${o_rsp.div_id}`]['m_12_total_amt_sum'] = (o_data['sum'][`${o_rsp.div_id}`]['m_12_total_amt_sum'] || 0 ) + (m_12_rsp?.total_amt_sum ?? 0)
            o_data['sum'][`${o_rsp.div_id}`]['m_12_bill_amt_sum'] = (o_data['sum'][`${o_rsp.div_id}`]['m_12_bill_amt_sum'] || 0 ) + (m_12_rsp?.bill_amt_sum ?? 0)
            o_data['sum'][`${o_rsp.div_id}`]['m_total_amt_sum'] = (o_data['sum'][`${o_rsp.div_id}`]['month_total_amt_sum'] || 0 ) + (month_rsp?.total_amt_sum ?? 0)
            o_data['sum'][`${o_rsp.div_id}`]['m_bill_amt_sum'] = (o_data['sum'][`${o_rsp.div_id}`]['month_bill_amt_sum'] || 0 ) + (month_rsp?.bill_amt_sum ?? 0)
            o_data['sum'][`${o_rsp.hdqt_id}`]['m_12_total_amt_sum'] = (o_data['sum'][`${o_rsp.hdqt_id}`]['m_12_total_amt_sum'] || 0 ) + (m_12_rsp?.total_amt_sum ?? 0)
            o_data['sum'][`${o_rsp.hdqt_id}`]['m_12_bill_amt_sum'] = (o_data['sum'][`${o_rsp.hdqt_id}`]['m_12_bill_amt_sum'] || 0 ) + (m_12_rsp?.bill_amt_sum ?? 0)
            o_data['sum'][`${o_rsp.hdqt_id}`]['m_total_amt_sum'] = (o_data['sum'][`${o_rsp.hdqt_id}`]['month_total_amt_sum'] || 0 ) + (month_rsp?.total_amt_sum ?? 0)
            o_data['sum'][`${o_rsp.hdqt_id}`]['m_bill_amt_sum'] = (o_data['sum'][`${o_rsp.hdqt_id}`]['month_bill_amt_sum'] || 0 ) + (month_rsp?.bill_amt_sum ?? 0)
        })
        const a_data = Object.values(o_data['team'])
        const a_sum = Object.values(o_data['sum'])
        let a_check = [];
        a_data.forEach(o_data =>{
            const s_div_check = a_check.find(id => id === o_data.div_id)
            if(!s_div_check && org_col_nm !== 'hdqt_id' && org_col_nm !== 'team_id'){
                let o_sum = a_sum.find(div => div.div_id === o_data.div_id);
                let o_temp = {
                    'ccorg_cd':o_sum.ccorg_cd,
                    'div_id':o_sum.div_id,
                    'div_name':o_sum.div_name,
                    'hdqt_id':o_sum.hdqt_id,
                    'hdqt_name':o_sum.hdqt_name,
                    'team_id':o_sum.team_id,
                    'team_name':o_sum.team_name,
                    'forecast_value': (o_sum?.m_12_total_amt_sum ?? 0) === 0 ? 0 :(o_sum?.m_12_bill_amt_sum ?? 0)/o_sum.m_12_total_amt_sum*100,
                    'secured_value': (o_sum?.m_total_amt_sum ?? 0) === 0 ? 0 :(o_sum?.m_bill_amt_sum ?? 0)/o_sum.m_total_amt_sum*100,
                    'not_secured_value': ((o_sum?.m_12_total_amt_sum ?? 0) - (o_sum?.m_total_amt_sum ?? 0)) === 0 ? 0 :((o_sum?.m_12_bill_amt_sum ?? 0) - (o_sum?.m_bill_amt_sum ?? 0))/((o_sum?.m_12_total_amt_sum ?? 0) - (o_sum?.m_total_amt_sum ?? 0))*100,
                    'target':o_sum.target,
                }
                a_check.push(o_data.div_id)
                oResult.push(o_temp);
            }
            const s_hdqt_check = a_check.find(id => id === o_data.hdqt_id)
            if(!s_hdqt_check && org_col_nm !== 'team_id'){
                let o_sum = a_sum.find(div => div.hdqt_id === o_data.hdqt_id);
                let o_temp = {
                    'ccorg_cd':o_sum.ccorg_cd,
                    'div_id':o_sum.div_id,
                    'div_name':o_sum.div_name,
                    'hdqt_id':o_sum.hdqt_id,
                    'hdqt_name':o_sum.hdqt_name,
                    'team_id':o_sum.team_id,
                    'team_name':o_sum.team_name,
                    'forecast_value': (o_sum?.m_12_total_amt_sum ?? 0) === 0 ? 0 :(o_sum?.m_12_bill_amt_sum ?? 0)/o_sum.m_12_total_amt_sum*100,
                    'secured_value': (o_sum?.m_total_amt_sum ?? 0) === 0 ? 0 :(o_sum?.m_bill_amt_sum ?? 0)/o_sum.m_total_amt_sum*100,
                    'not_secured_value': ((o_sum?.m_12_total_amt_sum ?? 0) - (o_sum?.m_total_amt_sum ?? 0)) === 0 ? 0 :((o_sum?.m_12_bill_amt_sum ?? 0) - (o_sum?.m_bill_amt_sum ?? 0))/((o_sum?.m_12_total_amt_sum ?? 0) - (o_sum?.m_total_amt_sum ?? 0))*100,
                    'target':o_sum.target,
                }
                a_check.push(o_data.hdqt_id)
                oResult.push(o_temp);
            }
            oResult.push(o_data);
        })

        return oResult;

    });
}