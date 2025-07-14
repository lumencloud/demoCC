const get_org_descendant = require('../function/get_org_descendant');

/**
 * 선택한 조직을 포함한 하위 조직 반환
 * @param {Array} aCommonOrg Common.Org의 조직 데이터 목록
 * @param {String} org_id 선택한 조직
 * @returns 
 */
module.exports = (srv) => {
    srv.on('get_org_descendant', async (req) => {
        try{
            // 조직 파라미터
            const { org_id, isTree, isDelivery } = req.data;

            let aResult = await get_org_descendant(org_id, isTree, isDelivery);
            return aResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}