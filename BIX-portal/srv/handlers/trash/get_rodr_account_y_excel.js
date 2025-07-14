module.exports = (srv) => {
    srv.on('get_rodr_account_y_excel', async (req) => {
        /**
         * API 리턴값 담을 배열 선언
         */
        const oResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        //엔티티 호출
        const pl_contract_amt = db.entities('pl').contract_amt;
        const common_account = db.entities('common').account;

        //account 전체 자료
        let account_list= await SELECT.from(common_account).columns(['biz_tp_account_cd','biz_tp_account_nm','sort_order']).orderBy('sort_order');

        //account code만 추출
        let account_list_code = [];
        account_list.forEach(data =>{
            account_list_code.push(data.biz_tp_account_cd);//biz_tp_account_cd 나중에 변경
        });
        
        if(account_list_code.length === 0){
            return;
        };

        //pl_contract_amt호출
        let rodr_where_conditions = { 'biz_tp_account_cd': account_list_code };

        let rodr_list= await SELECT.from(pl_contract_amt).where(rodr_where_conditions);

        oResult.push(...rodr_list);
        return oResult;
    });
}