const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_opp_br', async (req) => {
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
            const project = db.entities('common').project_view;
            const rsp = db.entities('rsp').opp_labor;
            // =================================================================================

            // function 입력 파라미터
            const { year, ccorg_cd } = req.data;

            // rsp 조회용 정보
            const rsp_column = ['ccorg_cd', 'biz_opp_no', 'prj_tp_nm', 'sum(received_order_amt) as received_order_amt', 'sum(sales_amt) as sales_amt', 'sum(sales_amt*(1-(margin_rate/100))) as labor_cost'];
            const rsp_where = { 'year': year, 'length(biz_opp_no)': { '>': 0 }, 'ccorg_cd': ccorg_cd };
            const rsp_groupBy = ['ccorg_cd', 'biz_opp_no', 'prj_tp_nm'];

            // 사업기횜 목록
            const project_column = ['biz_opp_no', 'biz_opp_nm'];
            const project_where = { 'length(biz_opp_no)': { '>': 0 }, 'length(biz_opp_nm)': { '>': 0 } };

            // DB 쿼리 실행 (병렬)
            const [rsp_data, opp_data] = await Promise.all([
                // PL 실적, 사업기회 목록 조회
                SELECT.distinct.from(rsp).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
                SELECT.from(project).columns(project_column).where(project_where)
            ]);
            if(!rsp_data.length){
                //return req.res.status(204).send();
                return []
            }

            rsp_data.forEach(o_rsp => {
                const o_opp = opp_data.find(o_find => o_find.biz_opp_no === o_rsp.biz_opp_no);
                if (o_opp) {
                    const o_temp = {
                        'biz_opp_no': o_rsp.biz_opp_no,
                        'biz_opp_nm': o_opp.biz_opp_nm,
                        'prj_tp_nm': o_rsp.prj_tp_nm,
                        'labor_cost': o_rsp.labor_cost || 0,
                        'received_order_amt': o_rsp.received_order_amt || 0,
                        'sales_amt': o_rsp.sales_amt || 0
                    }
                    oResult.push(o_temp);
                }
            })

            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 

    });
}