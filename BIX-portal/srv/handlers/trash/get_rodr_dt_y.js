const check_user_auth = require('../function/check_user_auth');
const get_org_target = require('../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_rodr_dt_y', async (req) => {
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
            let rodr_col_list = ['year', 'dgtr_task_cd',
                '(sum(prj_target_m1_amt) + sum(prj_target_m2_amt) + sum(prj_target_m3_amt) + sum(prj_target_m4_amt) + sum(prj_target_m5_amt) + sum(prj_target_m6_amt) + sum(prj_target_m7_amt) + sum(prj_target_m8_amt) + sum(prj_target_m9_amt) + sum(prj_target_m10_amt) + sum(prj_target_m11_amt) + sum(prj_target_m12_amt)) as rodr_sum'];
            let rodr_where_conditions = { 'dgtr_task_cd': dt_list_code };
            let rodr_groupBy_cols = ['year', 'dgtr_task_cd'];

            let rodr_list= await SELECT.from(pl_contract_amt).columns(rodr_col_list).where(rodr_where_conditions).groupBy(...rodr_groupBy_cols);

            if(!rodr_list.length){
                //return req.res.status(204).send();
                return []
            }
            //rodr_list값 조직id 및 년 기준 flat으로 변환
            let flat_rodr_list = rodr_list.reduce((acc, item) =>{
                let main = item['dgtr_task_cd'];
                let sub = item['year'];
                let rest = {...item};
                delete rest['dgtr_task_cd'];
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
            dt_list.forEach(data=>{
                let oTemp = {
                    dtTask : data.dgtr_task_nm.replace('\n','')
                };
                year_key.forEach(data2=>{
                    let column1_value = flat_rodr_list?.[`_`+data.dgtr_task_cd+`_`+data2+`rodr_sum`] ?? 0;
                    oTemp[`column${data2}`] = column1_value;
                });
                base_data.push(oTemp);
            });

            oResult.push(...base_data);
            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}