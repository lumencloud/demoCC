const check_user_auth = require('../function/check_user_auth');
const get_org_target = require('../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_rodr_dt_y_excel', async (req) => {
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

                //엔티티 호출
                const pl_contract_amt = db.entities('pl').contract_amt;
                const common_dt_task = db.entities('common').dt_task_view;
                
                //dt task 전체 자료
                let dt_list= await SELECT.from(common_dt_task).columns(['dgtr_task_cd','dgtr_task_nm','sort_order']).orderBy('sort_order');

                //dt task code만 추출
                let dt_list_code = [];
                dt_list.forEach(data =>{
                    dt_list_code.push(data.dgtr_task_cd);
                });
                
                if(dt_list_code.length === 0){
                    return;
                };

                //pl_contract_amt호출
                let rodr_where_conditions = { 'dgtr_task_cd': dt_list_code };

                let rodr_list= await SELECT.from(pl_contract_amt).where(rodr_where_conditions);

                oResult.push(...rodr_list);
                return oResult;
            } catch(error) { 
                console.error(error); 
                return {code:error.code, message:error.message, isError: true} 
            } 
    });
}