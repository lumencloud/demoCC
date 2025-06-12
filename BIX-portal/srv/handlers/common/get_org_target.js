const get_org_descendant = require('../function/get_org_descendant');

module.exports = (srv) => {
    srv.on('get_org_target', async (req) => {

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

        // 전체 조직
        const org_full_level = db.entities('common').org_full_level_view;

        const target_columns = ['target_cd','target_type_cd','target_val','is_total_calc'];
        const target_where_conditions = {'year':year, 'target_type': target_type}
        const code_columns = ['value','name','sort_order'];
        const code_where_conditions = {'header_ID':header_data['ID']}
        // DB 쿼리 실행 (병렬)
        const [target_data,item_data, aOrgFullLevel, aOrgDescendant, dt_task_data, account_data] = await Promise.all([
            SELECT.from(target).columns(target_columns).where(target_where_conditions),
            SELECT.from(code_item).columns(code_columns).where(code_where_conditions),
            SELECT.from(org_full_level).orderBy('org_order'),
            get_org_descendant(null, false), // 팀보다 상위 조직인 조직 데이터 반환(조직 구조를 팀보다 상위 조직으로),
            SELECT.from(dt_task).columns(['dgtr_task_cd','dgtr_task_nm','sort_order']).orderBy({'sort_order':true}),
            SELECT.from(account).columns(['biz_tp_account_cd','biz_tp_account_nm','sort_order']).orderBy({'sort_order':true}),
        ]);
        let a_filter_data = {};
        
        target_data.forEach(a=>{
            if(!a_filter_data[`${a.target_type_cd}`]){
                a_filter_data[`${a.target_type_cd}`] = []
            }
            a_filter_data[`${a.target_type_cd}`].push(a);
        })

        if(type === 'org'){
            let org_target = [];
    
            aOrgFullLevel.forEach(a=>{
                if(!a_filter_data[`${a.org_ccorg_cd}`]){
                    a_filter_data[`${a.org_ccorg_cd}`] = []
                }
                const o_data = { org_ccorg_cd : a.org_ccorg_cd}
                item_data.forEach(b=>{
                    const o_filter_data = a_filter_data[`${a.org_ccorg_cd}`].find(c=>c.target_cd === b.value);
                    o_data[`${b.value}_data`] = Number(o_filter_data?.['target_val'] ?? 0)
                    o_data[`${b.value}_total_yn`] = o_filter_data?.['is_total_calc']??false
                })
                org_target.push(o_data)
            })
            // amountData에 org_full_level 속성들 붙임
            org_target.forEach(function (o_target) {
                let oOrgFullLevel = aOrgFullLevel.find(org => org.org_ccorg_cd === o_target.org_ccorg_cd);
                if (!oOrgFullLevel) return;
    
                // org_full_level의 속성들을 o_target에 붙임
                const array = Object.keys(oOrgFullLevel).map(key => ({ key, value: oOrgFullLevel[key] }));
                array.forEach(object => o_target[object.key] = object.value);
            });
            aOrgDescendant.forEach(function (oOrg) {
    
                if(oOrg.type !== '1414'){
                    const aTarget = org_target.find(oTarget => {
                        return (oOrg.org_ccorg_cd === oTarget.org_ccorg_cd)
                    });
                    const o_data = { 
                        id: oOrg.org_id,
                        ccorg_cd: oOrg.org_ccorg_cd,
                        name: oOrg.org_name,
                        parent: oOrg.org_parent,
                        hierarchy_level: oOrg.hierarchy_level,
                        drill_state: oOrg.drill_state,
                        type: oOrg.org_type,
                        org_order: oOrg.org_order
                    }
                    item_data.forEach(b=>{
                        if(b.value !== 'D01'){
                            o_data[`${b.value}_data`] =  b.value === "A03" && aTarget[`A01_data`] && aTarget[`A02_data`] ? Math.ceil(aTarget[`A01_data`] * aTarget[`A02_data`] / 100)  
                                    : (aTarget?.[`${b.value}_data`]??0)
                            o_data[`${b.value}_total_yn`] = (aTarget?.[`${b.value}_total_yn`] ?? false)
                        }
                    })
    
                    aRes.push(o_data)
                }
            });
            // 배열 데이터를 Tree 구조로 만드는 함수
            function buildTree(oFinalData) {
                let aTree = [];
                let oLookup = [];
                oFinalData.forEach(item => {
                    oLookup[item.id] = { ...item, children: [] };
                })
                oFinalData.forEach(item => {
                    if (item.parent !== null && oLookup[item.parent]) {
                        oLookup[item.parent].children.push(oLookup[item.id]);
                    } else {
                        aTree.push(oLookup[item.id]);
                    }
                })
    
                function sortTree(oFinalData) {
                    oFinalData.sort((a, b) => a.org_order - b.org_order);
                    oFinalData.forEach(oData => {
                        if (oData.children.length > 0) {
                            sortTree(oData.children);
                        }
                    })
                }
                
                sortTree(aTree);
                return aTree;
            }
    
            aRes = buildTree(aRes);
        }else if(type === 'task'){
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

        return aRes

    })
};