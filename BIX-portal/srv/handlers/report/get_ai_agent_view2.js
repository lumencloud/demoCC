const cds = require('@sap/cds');

module.exports = function (srv) {
    srv.on('*', async (req) => {
        const { start_date, end_date } = req.data;
        
        try {
            // 파라미터가 있는 CDS 뷰 호출 방식
            const result = await cds.run(`
                SELECT * FROM ai_ai_agent_view2(
                    start_date => ?,
                    end_date => ?
                )
            `, [start_date, end_date]);
            
            return result;
        } catch (error) {
            console.error('AI Agent View2 조회 실패:', error);
            throw error;
        }
    });
};