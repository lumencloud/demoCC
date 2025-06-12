module.exports = (srv) => {
    srv.on('get_forecast_opp_br', async (req) => {

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
        const project = db.entities('common').project;
        const rsp = db.entities('rsp').opp_labor;
        // =================================================================================

        // function 입력 파라미터
        const { year, ccorg_cd } = req.data;

        // QUERY 공통 파라미터 선언
        // rsp 조회용 정보
        const rsp_col_list = ['ccorg_cd','biz_opp_no','prj_tp_nm','sum(ifnull(received_order_amt,0)) as received_order_amt', 'sum(ifnull(sales_amt,0)) as sales_amt', 'sum(ifnull(sales_amt,0)*(1-(ifnull(margin_rate,0)/100))) as labor_cost'];
        const rsp_where_conditions = { 'year': year, 'biz_opp_no':{'!=':null}, 'ccorg_cd':ccorg_cd };
        const rsp_groupBy_cols = ['ccorg_cd','biz_opp_no','prj_tp_nm'];
        
        const opp_col_list = ['biz_opp_nm','biz_opp_no'];
        const opp_where_conditions = {'biz_opp_nm':{'!=':null},'biz_opp_no':{'!=':null}};
        const opp_groupBy_cols = ['biz_opp_nm','biz_opp_no'];
        
        let rsp_column = rsp_col_list;
        let rsp_where = rsp_where_conditions;
        let rsp_groupBy = rsp_groupBy_cols;
        
        let opp_column = opp_col_list;
        let opp_where = opp_where_conditions;
        let opp_groupBy = opp_groupBy_cols;

        // DB 쿼리 실행 (병렬)
        const [rsp_data,opp_data] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(rsp).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
            SELECT.from(project).columns(opp_column).where(opp_where).groupBy(...opp_groupBy)
        ]);
        
        rsp_data.forEach(o_rsp =>{
            const o_opp = opp_data.find(o_find => o_find.biz_opp_no === o_rsp.biz_opp_no)
            if(o_opp){
                const o_temp = {
                    'biz_opp_no': o_rsp.biz_opp_no,
                    'biz_opp_nm': o_opp.biz_opp_nm,
                    'prj_tp_nm': o_rsp.prj_tp_nm,
                    'labor_cost': o_rsp.labor_cost,
                    'received_order_amt': o_rsp.received_order_amt,
                    'sales_amt': o_rsp.sales_amt
                }
                oResult.push(o_temp);
            }
        })

        return oResult;

    });
}