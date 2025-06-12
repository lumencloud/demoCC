module.exports = (srv) => {
    srv.on('call_if_common_project', async (req) => {

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');
        const common_if_project = db.entities('common').if_project;

        // 로컬에서는 destinationName 방식 인증이 안뚤림.. 추가 확인 필요 / 그 전까지는 로컬 앱라우터 통해서 접근
        let oRequestInfo = { destinationName: 'ERP_IT_CAP' };
        if(process.env.NODE_ENV !== 'production') {
            oRequestInfo = { url: 'http://localhost:5000'}
        }
        
        const response = await executeHttpRequest(
            oRequestInfo,
            {
                method: 'get',
                url: '/http/PR6006',
                headers: {
                    Accept: 'application/json'
                }
            },
            {
                fetchCsrfToken: false
            }
        );

        if(response.data.returnCode === 'S'){
            // 트랜젝션 생성
            let tx = db.tx();
            // 트랜젝션 실행
            try {

                // 두번째 프로시저 실행 O_RESULT 는 out param이라 인자값 전달 안 함
                const procQuery = `CALL P_IF_COMMON_PROJECT_PROMIS_TRSF(O_RESULT => ?)`;
                const O_RESULT = await tx.run(procQuery); // O_RESULT 값을 변수에 담음

                // 이상없이 실행되면 커밋처리
                if(O_RESULT.O_RESULT.length > 0 && O_RESULT.O_RESULT.find(o=>o.RESULT_CODE === 'NG') ){
                    await DELETE.from(common_if_project).where({flag : null});
                    await tx.rollback();
                    throw new Error( JSON.stringify(O_RESULT) );
                    
                }else{
                    await tx.commit();
                    return O_RESULT;
                }
                
            } catch (e) {
                console.log(e)
                // 에러 발생시 롤백
                await tx.rollback();
                await DELETE.from(common_if_org).where({flag : null});
                return { error: e.message };
            }
        }else {
            await DELETE.from(common_if_org).where({flag : null});
            await tx.rollback();
            throw new Error("IS 프로시저 호출 에러" + JSON.stringify(is_response));
        }
    })
}