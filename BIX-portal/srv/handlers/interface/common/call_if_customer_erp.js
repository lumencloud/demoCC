const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const { getDestination } = require('@sap-cloud-sdk/connectivity');

module.exports = (srv) => {
    srv.on('call_if_customer_erp', async (req) => {

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');
        // 버전 값
        const {ver} = req.data;
        // 트랜젝션 생성
        let tx = db.tx();
        // 트랜젝션 실행
        try {
            let oRequestInfo = { destinationName: 'ERP_HTTP_DEST' };
            if(process.env.NODE_ENV !== 'production') {
                oRequestInfo = { url: 'http://localhost:5000'}
            }
            
            const requestData = async (sURL)=>{
                
                const response = await executeHttpRequest(
                    oRequestInfo,
                    {
                        method: 'get',
                        url: sURL,
                        headers: {
                            Accept: 'application/json'
                        }
                    },
                    {
                        fetchCsrfToken: false
                    }
                );
                
                const IF_JSONDATA = [];

                // erp odata v4 응답구조 data: { value: [] }
                IF_JSONDATA.push(response.data.value);

                const IF_STRING_JSON = JSON.stringify({ "DATA": IF_JSONDATA.flat() });
    
                // 첫번째 프로시저 실행
                // 인자값은 변수만 <파라미터명> => ${<변수명>} 양식 가능, json 데이터는 <파라미터명> => ? , [변수명]
                await tx.run(`CALL P_IF_COMMON_CUSTOMER_ERP_RCV( VER => '${ver}', JSONDATA => ? )`, [IF_STRING_JSON]);
            }

            const entityUri = '/sap/opu/odata4/sap/zapi_bix_master_o4/srvd_a2x/sap/zsd_bix_master/0001/Customer';
            const call_list = [];
            
            const dataCount = await executeHttpRequest(
                oRequestInfo,
                {
                    method: 'get',
                    url: entityUri + '/$count',
                    headers: {
                        Accept: 'application/json'
                    }
                },
                {
                    fetchCsrfToken: false
                }
            );

            for(let i=0; i<dataCount.data/100; i++){
                call_list.push(requestData(entityUri+'?$skiptoken='+i*100));
            }

            await Promise.all(call_list);

            // 두번째 프로시저 실행 O_RESULT 는 out param이라 인자값 전달 안함
            const procQuery = `CALL P_IF_COMMON_CUSTOMER_ERP_TRSF( VER => '${ver}', O_RESULT => ? )`;
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