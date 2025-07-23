const { UPDATE } = require("@sap/cds/lib/ql/cds-ql");

module.exports = (srv) => {
    srv.before('UPDATE', "dashboard_set", async (req) => {
        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // function 입력 파라미터
        const {use_flag} = req.data;
        /**
         * dashboard.dashboard_set [대시보드 정보]
         * 대시보드 테이블
         */
        const dashboard_set = db.entities('common').dashboard_set;
        if (use_flag) {
            await UPDATE(dashboard_set).set({use_flag : false})
        }
    });
}