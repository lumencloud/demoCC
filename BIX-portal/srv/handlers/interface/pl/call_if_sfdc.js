// const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
// const { getDestination } = require('@sap-cloud-sdk/connectivity');

module.exports = (srv) => {
    srv.on('call_if_sfdc', async (req) => {

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');
        // 트랜젝션 생성
        let tx = db.tx();
        // 트랜젝션 실행
        try {
            const IF_JSONDATA = [];

            // 첫번째 프로시저 실행
            // 인자값은 변수만 <파라미터명> => ${<변수명>} 양식 가능, json 데이터는 <파라미터명> => ? , [변수명]
            // await tx.run(`CALL P_IF_PL_SFDC_RCV( JSONDATA => ? )`, [IF_STRING_JSON]);

            // 두번째 프로시저 실행 O_RESULT 는 out param이라 인자값 전달 안함
            const procQuery = `CALL P_IF_PL_SFDC_TRSF( O_RESULT => ? )`;
            const O_RESULT = await tx.run(procQuery); // O_RESULT 값을 변수에 담음

            // 이상없이 실행되면 커밋처리
            await tx.commit();
            return O_RESULT;

        } catch (e) {
            console.log(e)
            // 에러 발생시 롤백
            await tx.rollback();
            return { error: e.message };
        }
    })
}