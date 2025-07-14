/**
 * 연간 목표 데이터
 * a_target_list = [
        '매출','마진액','공헌이익','BR (MM)','RoHC','BR (Cost)','Offshoring','DT매출'
        ,'Non-MM','SG&A','영업이익','전사영업이익','총액 인건비','인건비','투자비','경비'
 * ]
 */

module.exports = async function (year, a_target_list) {
    const db = await cds.connect.to('db');
    const org_full_level = db.entities('common').org_full_level_view;
    const target = db.entities('common').annual_target;

    const a_item = [
        { value: 'A01', name: '매출', target: 'target_sale' },  // target_sale_amt // A02 : target_margin_rate
        { value: 'A03', name: '마진액', target: 'target_margin' },  // target_margin_amt
        { value: 'A04', name: '공헌이익', target: 'target_cont_profit' },  // target_cont_margin_amt
        { value: 'A05', name: 'BR (MM)', target: 'target_br_mm' },  // target_br_mm_amt
        { value: 'A06', name: 'RoHC', target: 'target_rohc' },  // target_rohc
        { value: 'A07', name: 'BR (Cost)', target: 'target_br_cost' },  // target_br_cost_amt
        { value: 'B01', name: 'Offshoring', target: 'target_offshoring' },  // offshore_target_amt
        { value: 'B02', name: 'DT매출', target: 'target_dt_sale' },  // dt_target_sale_amt
        { value: 'B04', name: 'Non-MM', target: 'target_non_mm' },  // non_mm_target_sale_amt
        { value: 'C01', name: 'SG&A', target: 'target_sga' },  // sga_target_amt
        { value: 'C02', name: '영업이익', target: 'target_sale_profit' },  // profit_target_amt
        { value: 'C03', name: '전사영업이익', target: 'target_total_profit' },  // total_profit_target_amt
        { value: 'C04', name: '총액 인건비', target: 'target_total_labor' },  // total_labor_target_amt
        // {value:'C05',name:'인건비',target:'target_labor'},  // labor_target_amt
        // {value:'C06',name:'투자비',target:'target_invest'},  // invest_target_amt
        // {value:'C07',name:'경비',target:'target_expense' },  // expense_target_amt
        { value: 'C08', name: '전사SG&A', target: 'target_total_sga' },
    ]

    let a_target_item = []

    a_target_list.forEach(target => {
        if(target === 'A02'){
            if(!a_target_list.includes('A01')){
                let o_find_item = a_item.find(item => item.value === 'A01')
                a_target_item.push(o_find_item)
            }
            if(!a_target_list.includes('A03')){
                let o_find_item = a_item.find(item => item.value === 'A03')
                a_target_item.push(o_find_item)
            }
        }else{
            let o_find_item = a_item.find(item => item.value === target)
            a_target_item.push(o_find_item)
        }
    })

    const target_columns = [
        'target_cd',
        'target_type_cd',
        'target_val',
        'ifnull(is_total_calc,false) as is_total_calc'
    ]

    const target_where = { target_type: 'ccorg_cd', year: String(year) }

    const [org_data, target_data] = await Promise.all([
        SELECT.from(org_full_level).where({ org_id: { '!=': null }, team_id: null }).orderBy(`org_order`),
        SELECT.from(target).columns(target_columns).where(target_where),
    ]);

    let a_tree = [];
    let o_look_up = [];
    let a_org_keys = Object.keys(org_data[0])
    org_data.forEach(org => {
        const org_target = target_data.filter(target => target.target_type_cd === org.org_ccorg_cd)
        a_target_item.forEach(item => {
            const o_target = org_target.find(target => target.target_cd === item.value);
            org[`${item.target}`] = o_target?.target_val ?? 0
            org[`new_${item.target}`] = (o_target?.is_total_calc ?? false) ? (o_target?.target_val ?? 0) : 0
            org[`${item.target}_total_yn`] = o_target?.is_total_calc ?? false
        })
        o_look_up[org.org_id] = { ...org, children: [] };
        if (org.org_parent !== null && o_look_up[org.org_parent]) {
            o_look_up[org.org_parent].children.push(o_look_up[org.org_id]);
        } else {
            a_tree.push(o_look_up[org.org_id]);
        }
    })

    function sum_target(a_data, s_target) {
        if(a_data[`${s_target}_total_yn`]){
            a_data[`new_${s_target}`] = Math.floor(a_data[`new_${s_target}`]);
            if(a_data.children.length){
                a_data.children.forEach(child => {
                    sum_target(child, s_target);
                })
            }
            return Math.floor(a_data[`new_${s_target}`]);
        }else if(!a_data[`${s_target}_total_yn`] && !!a_data.children.length){
            a_data[`new_${s_target}`] = a_data.children.reduce((sum, child) => {
                return sum + sum_target(child, s_target);
            }, 0);
            return Math.floor(a_data[`new_${s_target}`]);
        }else{
            return 0
        }
    }

    a_tree.forEach(data => {
        a_target_item.forEach(item => {
            sum_target(data, item.target)
        })
    })
    
    function set_flat_data(a_data, a_flat) {
        let o_temp = {}
        a_target_item.forEach(item => {
            if(a_data.div_id && !a_data[`new_${item.target}`]){
                a_data[`new_${item.target}`] = a_data[`${item.target}`]
            }
            if((item.value === 'A01' && !a_target_list.includes('A01')) || (item.value === 'A03' && !a_target_list.includes('A03'))) return
            o_temp[`${item.target}`] = Number(a_data[`new_${item.target}`])
        })
        if(a_target_list.includes('A02')){
            o_temp[`target_margin_rate`] = a_data[`new_target_sale`] === 0 ? 0 : (Number(a_data[`new_target_margin`])/Number(a_data[`new_target_sale`])*100)
        }
        a_org_keys.forEach(key => {
            o_temp[`${key}`] = a_data[`${key}`]
        })
        a_flat.push(o_temp)
        if (!!a_data.children.length) {
            a_data.children.forEach(child => {
                set_flat_data(child, a_flat)
            })
        }
    }

    let a_flat = []

    a_tree.forEach(data => {
        set_flat_data(data, a_flat)
    })

    return a_flat
}