const get_available_org_list = require('../function/get_available_org_list');

/**
 * 로그인한 사용자가 접근 가능한 조직의 목록을 반환
 * @param {Boolean} isTree 트리 형태로 반환할지 여부
 * @returns 
 */
module.exports = (srv) => {
    srv.on('get_available_org_list', async (req) => {
        try{
            // 조직 파라미터
            const { isTree } = req.data;

            let available_org_list = await get_available_org_list(req);

            // isTree가 true일 때 tree 구조로 반환
            if (isTree) {
                let aTree = [];
                let oLookup = [];
                available_org_list.forEach(oItem => {
                    oLookup[oItem.org_id] = { ...oItem, children: [] };
                });
                available_org_list.forEach(oItem => {
                    if (oItem.org_parent !== null && oLookup[oItem.org_parent]) {
                        oLookup[oItem.org_parent].children.push(oLookup[oItem.org_id]);
                    } else {
                        aTree.push(oLookup[oItem.org_id]);
                    };
                });
                function sortTree(tree) { // 재귀적으로 정렬하는 함수
                    tree.sort((a, b) => a.sort_order - b.sort_order);
                    tree.forEach(node => {
                        if (node.children.length > 0) {
                            sortTree(node.children);
                        }
                    });
                };
                sortTree(aTree); // 최상위 노드부터 정렬
                return aTree;
            } else {
                return available_org_list;
            }
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}