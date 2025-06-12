module.exports = (srv) => {
    srv.on('get_rodr_account_y', async (req) => {
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
        let rodr_col_list = ['year', 'biz_tp_account_cd',
            '(sum(ifnull(prj_target_m1_amt,0)) + sum(ifnull(prj_target_m2_amt,0)) + sum(ifnull(prj_target_m3_amt,0)) + sum(ifnull(prj_target_m4_amt,0)) + sum(ifnull(prj_target_m5_amt,0)) + sum(ifnull(prj_target_m6_amt,0)) + sum(ifnull(prj_target_m7_amt,0)) + sum(ifnull(prj_target_m8_amt,0)) + sum(ifnull(prj_target_m9_amt,0)) + sum(ifnull(prj_target_m10_amt,0)) + sum(ifnull(prj_target_m11_amt,0)) + sum(ifnull(prj_target_m12_amt,0))) as rodr_sum'];
        let rodr_where_conditions = { 'biz_tp_account_cd': account_list_code };
        let rodr_groupBy_cols = ['year', 'biz_tp_account_cd'];

        let rodr_list= await SELECT.from(pl_contract_amt).columns(rodr_col_list).where(rodr_where_conditions).groupBy(...rodr_groupBy_cols);

        //rodr_list값 조직id 및 년 기준 flat으로 변환
        let flat_rodr_list = rodr_list.reduce((acc, item) =>{
            let main = item['biz_tp_account_cd'];
            let sub = item['year'];
            let rest = {...item};
            delete rest['biz_tp_account_cd'];
            delete rest['year'];
            Object.entries(rest).forEach(([key, value])=>{
                acc[`_${main}_${sub}${key}`] = value;
            });
            return acc;
        }, {});

        //pl_contract_amt 값 중 year 값만 순서대로 추출
        let year_key=[];
        rodr_list.filter(data =>{
            if(!year_key.includes(data.year)){
                year_key.push(data.year);
                return true;
            };
            return false;
        }); 
        year_key.sort((a,b)=> Number(a) - Number(b));

        //반환 데이터 정리
        let base_data = [];
        account_list.forEach(data=>{
            let oTemp = {
                accountName : data.biz_tp_account_nm
            };
            year_key.forEach(data2=>{
                let column1_value = flat_rodr_list?.[`_`+data.biz_tp_account_cd+`_`+data2+`rodr_sum`] ?? 0;
                oTemp[`column${data2}`] = column1_value;
            });
            base_data.push(oTemp);
        });

        oResult.push(...base_data);
        return oResult;
    });
}