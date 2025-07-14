const cds = require('@sap/cds');

module.exports = function (srv) {
    srv.on('*', async (req) => {
        const { start_date, end_date } = req.data;
        
        try {
            // ai_agent_view6는 년월 파라미터를 사용하므로 다른 방식
            const result = await cds.run(`
                SELECT * FROM ai_ai_agent_view6(
                    start_date => ?,
                    end_date => ?
                )
            `, [start_date, end_date]);
            
            return result;
        } catch (error) {
            console.error('AI Agent View6 조회 실패:', error);
            throw error;
        }
    });
};