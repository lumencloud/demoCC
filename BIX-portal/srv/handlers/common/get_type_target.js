const get_org_descendant = require('../function/get_org_descendant');

module.exports = (srv) => {
    srv.on('get_type_target', async (req) => {
        try{

            let aRes = []

            const year = new Date().getFullYear().toString();
            //org:조직별, task: DT과제별, account: Account별
            const {type} = req.data
            let target_type = type === 'org' ? 'ccorg_cd' : type === 'account' ? 'biz_tp_account_cd' : 'dgtr_task_cd';

            // cds 모듈을 통한 DB 커넥트
            const db = await cds.connect.to('db');
            const target = db.entities('common').annual_target;
            const code_header = db.entities('common').code_header;
            const code_item = db.entities('common').code_item;
            const dt_task = db.entities('common').dt_task
            const account = db.entities('common').account
            const header_data = await SELECT.one.from(code_header).where({'category':'target_code'})

            const target_columns = ['target_cd','target_type_cd','target_val','is_total_calc'];
            const target_where_conditions = {'year':year, 'target_type': target_type, 'target_cd':{'!=':'D01'}}
            const code_columns = ['value','name','sort_order'];
            const code_where_conditions = {'header_ID':header_data['ID']}

            if(type === 'org'){
                const [target_data,item_data,aOrgDescendant] = await Promise.all([
                    SELECT.from(target).columns(target_columns).where(target_where_conditions),
                    SELECT.from(code_item).columns(code_columns).where(code_where_conditions),
                    get_org_descendant(null, false), // 팀보다 상위 조직인 조직 데이터 반환(조직 구조를 팀보다 상위 조직으로)
                ]);

                aOrgDescendant.forEach(function (oOrg) {
                    if(oOrg.team_id === null){
                        const aTarget = target_data.filter(target => target.target_type_cd === oOrg.org_ccorg_cd)
                        const o_data = { 
                            id: oOrg.org_id,
                            ccorg_cd: oOrg.org_ccorg_cd,
                            name: oOrg.org_name,
                            parent: oOrg.org_parent,
                            lv1_id: oOrg.lv1_id,
                            lv2_id: oOrg.lv2_id,
                            lv3_id: oOrg.lv3_id,
                            div_id: oOrg.div_id,
                            hdqt_id: oOrg.hdqt_id,
                            hierarchy_level: oOrg.hierarchy_level,
                            drill_state: oOrg.drill_state,
                            org_order: oOrg.org_order
                        }
                        item_data.forEach(item=>{
                            let o_target = aTarget.find(target => target.target_cd === item.value)
                            o_data[`${item.value}_data`] =  item.value === 'A02' ? 0 : Number(o_target?.target_val ?? 0)
                            o_data[`new_${item.value}_data`] =  item.value === 'A02' ? 0 : Number(o_target?.target_val ?? 0)
                            o_data[`total_t_${item.value}_data`] =  item.value === 'A02' ? 0 : Number(o_target?.target_val ?? 0)
                            o_data[`total_f_${item.value}_data`] =  item.value === 'A02' ? 0 : Number(o_target?.target_val ?? 0)
                            o_data[`${item.value}_total_yn`] = o_target?.is_total_calc??false
                            o_data[`new_${item.value}_total_yn`] = o_target?.is_total_calc??false
                        })
        
                        aRes.push(o_data)
                    }
                });

                // 배열 데이터를 Tree 구조로 만드는 함수
                function build_tree(a_data) {
                    let a_tree = [];
                    let o_look_up = [];
                    a_data.forEach(item => {
                        o_look_up[item.id] = { ...item, children: [] };
                    })
                    a_data.forEach(item => {
                        if (item.parent !== null && o_look_up[item.parent]) {
                            o_look_up[item.parent].children.push(o_look_up[item.id]);
                        } else {
                            a_tree.push(o_look_up[item.id]);
                        }
                    })
        
                    function sort_tree(a_data) {
                        a_data.sort((a, b) => a.org_order - b.org_order);
                        a_data.forEach(data => {
                            if (data.children.length > 0) {
                                sort_tree(data.children);
                            }
                        })
                    }
                    
                    sort_tree(a_tree);
                    return a_tree;
                }
                
                aRes = build_tree(aRes);
            }else if(type === 'task'){
            const [target_data,item_data, dt_task_data] = await Promise.all([
                SELECT.from(target).columns(target_columns).where(target_where_conditions),
                SELECT.from(code_item).columns(code_columns).where(code_where_conditions),
                SELECT.from(dt_task).columns(['dgtr_task_cd','dgtr_task_nm','sort_order']).orderBy({'sort_order':true})
            ]);
            let a_filter_data = {};
            
            target_data.forEach(a=>{
                if(!a_filter_data[`${a.target_type_cd}`]){
                    a_filter_data[`${a.target_type_cd}`] = []
                }
                a_filter_data[`${a.target_type_cd}`].push(a);
            })
                dt_task_data.forEach(o_dt_task => {
                    let o_temp = {
                        task_cd : o_dt_task.dgtr_task_cd,
                        task_nm : o_dt_task.dgtr_task_nm,
                        sort_order : o_dt_task.sort_order,
                        highlight : 'None'
                    }
                    if(!a_filter_data[`${o_dt_task.dgtr_task_cd}`]){
                        a_filter_data[`${o_dt_task.dgtr_task_cd}`] = [];
                    }
                    item_data.forEach(o_item=>{
                        const o_filter_data = a_filter_data[`${o_dt_task.dgtr_task_cd}`].find(o_data => o_data.target_cd === o_item.value)

                        o_temp[`${o_item.value}_data`] = Number(o_filter_data?.['target_val'] ?? 0)
                        o_temp[`${o_item.value}_total_yn`] = o_filter_data?.['is_total_calc']??false
                        o_temp[`new_${o_item.value}_data`] = Number(o_filter_data?.['target_val'] ?? 0)
                        o_temp[`new_${o_item.value}_total_yn`] = o_filter_data?.['is_total_calc']??false
                    })
                    o_temp['A03_data'] = Math.ceil(o_temp[`A01_data`] * o_temp[`A02_data`] / 100) 
                    o_temp['new_A03_data'] = Math.ceil(o_temp[`A01_data`] * o_temp[`A02_data`] / 100) 
                    aRes.push(o_temp)
                })
            }else if(type === 'account'){
            const [target_data,item_data,account_data] = await Promise.all([
                SELECT.from(target).columns(target_columns).where(target_where_conditions),
                SELECT.from(code_item).columns(code_columns).where(code_where_conditions),
                SELECT.from(account).columns(['biz_tp_account_cd','biz_tp_account_nm','sort_order']).orderBy({'sort_order':true})
            ]);
            let a_filter_data = {};
            
            target_data.forEach(a=>{
                if(!a_filter_data[`${a.target_type_cd}`]){
                    a_filter_data[`${a.target_type_cd}`] = []
                }
                a_filter_data[`${a.target_type_cd}`].push(a);
            })
                account_data.forEach(o_account => {
                    let o_temp = {
                        account_cd : o_account.biz_tp_account_cd,
                        account_nm : o_account.biz_tp_account_nm,
                        sort_order : o_account.sort_order,
                        highlight : 'None'
                    }
                    if(!a_filter_data[`${o_account.biz_tp_account_cd}`]){
                        a_filter_data[`${o_account.biz_tp_account_cd}`] = [];
                    }
                    item_data.forEach(o_item=>{
                        const o_filter_data = a_filter_data[`${o_account.biz_tp_account_cd}`].find(o_data => o_data.target_cd === o_item.value)
                        o_temp[`${o_item.value}_data`] = Number(o_filter_data?.['target_val'] ?? 0)
                        o_temp[`${o_item.value}_total_yn`] = o_filter_data?.['is_total_calc']??false
                        o_temp[`new_${o_item.value}_data`] = Number(o_filter_data?.['target_val'] ?? 0)
                        o_temp[`new_${o_item.value}_total_yn`] = o_filter_data?.['is_total_calc']??false
                    })
                    o_temp['A03_data'] = Math.ceil(o_temp[`A01_data`] * o_temp[`A02_data`] / 100) 
                    o_temp['new_A03_data'] = Math.ceil(o_temp[`A01_data`] * o_temp[`A02_data`] / 100) 
                    aRes.push(o_temp)
                })
            }

            return aRes;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true};
        } 
    })
};