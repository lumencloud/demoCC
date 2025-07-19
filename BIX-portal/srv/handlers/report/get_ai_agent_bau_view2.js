const cds = require('@sap/cds');

module.exports = function (srv) {
    srv.on('*', async (req) => {
        const { start_date, end_date } = req.data;
        
        try {
            const result = await cds.run(`
                SELECT * FROM ai_ai_agent_bau_view2(
                    start_date => ?,
                    end_date => ?
                )
            `, [start_date, end_date]);
            
            return result;
        } catch (error) {
            console.error('View 조회 실패:', error);
            return [];
        }
    });
};