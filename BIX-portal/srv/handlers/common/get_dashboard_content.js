module.exports = (srv) => {
    srv.on('get_dashboard_content', async (req) => {
        try{
            // cds 모듈을 통한 DB 커넥트
            const db = await cds.connect.to('db');

            // function 입력 파라미터
            const {dashboard_id} = req.data;
            /**
             * common.org [조직정보]
             * 조직구조 테이블
             */
            const dashboard_content = db.entities('common').dashboard_content;
            // DB 쿼리 실행 (병렬)
            const [aDashBoardContent] = await Promise.all([
                SELECT.from(dashboard_content).orderBy(`ui_seq`),
            ]);

            const aMap = new Map();

            aDashBoardContent.forEach(oContent => {
                aMap.set(oContent.ID, { ...oContent, children: []})
            })

            aDashBoardContent.forEach(oContent => {
                if (oContent.Parent_ID != null) {
                    const oParent = aMap.get(oContent.Parent_ID);
                    if (oParent) {
                        oParent.children.push(aMap.get(oContent.ID))
                    }
                }
            })

            const oRootContent = [];
            aDashBoardContent.forEach(oContent => {
                if (oContent.Parent_ID === null && oContent.dashboard_ID === dashboard_id) {
                    oRootContent.push(aMap.get(oContent.ID));
                }
            })
            oRootContent.sort((a, b)=> a["ui_seq"] - b["ui_seq"]);
            return oRootContent;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}