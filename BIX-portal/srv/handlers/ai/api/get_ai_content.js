module.exports = async function (sId) {
    // srv.on('get_ai_content', async (req) => {
        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');
        // function 입력 파라미터
        let ai_id = sId;
        /**
         * common.org [조직정보]
         * 조직구조 테이블
         */
        const ai_content = db.entities('ai').ai_content;
        // DB 쿼리 실행 (병렬)
        const [aAiContent] = await Promise.all([
            SELECT.from(ai_content).orderBy(`ui_seq`),
        ]);

        const aMap = new Map();

        aAiContent.forEach(oContent => {
            aMap.set(oContent.ID, { ...oContent, children: []})
        })

        aAiContent.forEach(oContent => {
            if (oContent.Parent_ID != null) {
                const oParent = aMap.get(oContent.Parent_ID);
                if (oParent) {
                    oParent.children.push(aMap.get(oContent.ID))
                }
            }
        })

        const oRootContent = [];
        aAiContent.forEach(oContent => {
            if (oContent.Parent_ID === null && oContent.dashboard_ID === ai_id) {
                oRootContent.push(aMap.get(oContent.ID));
            }
        })
        oRootContent.sort((a, b)=> a["ui_seq"] - b["ui_seq"]);
        return oRootContent;
    // });
}