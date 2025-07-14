const { func } = require('@sap/cds/lib/ql/cds-ql');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');

module.exports = (srv) => {
    srv.on('execute_wbs_prj_platform_batch', async (req) => {
        const { ver, ver_last } = req.data;

        const tx = cds.tx(req);
        const db = await cds.connect.to('db');
        const common_version = db.entities('common').version;
        const common_interface_log = db.entities('common').interface_log;
        const common_if_project = db.entities('common').if_project;
        const common_project_platform = db.entities('common').project_platform;
        const pl_if_wideview = db.entities('pl').if_wideview;

        const empty_prj = await SELECT.distinct.from(common_project_platform).columns('prj_no')
            .where({ 'prj_no': { 'not like': '%-O%' }, and: { 'ver': ver, or: { 'ver': ver_last } }, and: { cstco_cd: null, or: { prj_tp_cd: null, or: { relsco_yn: null } } } });

        if (empty_prj?.length <= 0) return;

        /**
         * hanlder 에서 인터페이스 로그 처리 함수
         */
        const Insert_log = async (step, source, table, procedure_name, success, log, err_cd) => {
            await tx.run(INSERT([{
                ver: ver_no,
                uuid: func('SYSUUID')[0],
                CREATEDAT: new Date(),
                if_step: step,
                source: source,
                procedure_name: procedure_name,
                table_name: table,
                success_yn: success,
                log: log ? log : null,
                err_cd: err_cd ? err_cd : null
            }]).into(common_interface_log));
        };

        try {

            // 트랜젝션 실행
            let oRequestInfo = { destinationName: 'ERP_HTTP_DEST' };
            if (process.env.NODE_ENV !== 'production') {
                oRequestInfo = { url: 'http://localhost:5000' }
            }

            const requestData = async (sURL) => {

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
                        fetchCsrfToken: true
                    }
                );

                const IF_JSONDATA = [];

                // erp odata v4 응답구조 data: { value: [] }
                IF_JSONDATA.push(response.data.value);

                const IF_STRING_JSON = JSON.stringify({ "DATA": IF_JSONDATA.flat() });

                // 첫번째 프로시저 실행
                // 인자값은 변수만 <파라미터명> => ${<변수명>} 양식 가능, json 데이터는 <파라미터명> => ? , [변수명]
                await tx.run(`CALL P_IF_COMMON_PROJECT_PROJECT_PLATFORM_ERP_TRSF( VER => '${ver}', VER_LAST => '${ver_last}', JSONDATA => ? )`, [IF_STRING_JSON])
                    .catch(err => {
                        Insert_log('RCV', 'ERP', 'COMMON_PROJECT_PLATFORM', "P_IF_COMMON_PROJECT_PROJECT_PLATFORM_ERP_TRSF", false, err.message?.slice(0, 500), err.code);
                        throw new Error(err.message);
                    });
            }

            const call_list = [];
            let origin_path = '';

            for (let i = 0; i < empty_prj.length; i++) {

                let prj_no = empty_prj[i].prj_no;
                if (i % 10 === 0) {
                    if (i !== 0) call_list.push(origin_path);
                    origin_path = `/sap/opu/odata4/sap/zapi_bix_master_o4/srvd_a2x/sap/zsd_bix_master/0001/Wbs?$filter=WBSElement eq '${prj_no}'`;
                    if (empty_prj.length === 1) call_list.push(origin_path);
                } else {
                    origin_path += `or WBSElement eq '${prj_no}'`
                    if (i + 1 === empty_prj.length) call_list.push(origin_path);
                }
            }

            const paging_result = await Promise.allSettled(call_list.map(pageUri => requestData(pageUri)))
            if (paging_result.filter(o => o.status === 'rejected').length > 0) {
                // 에러메시지 정리
                throw new Error(paging_result.filter(o => o.status === 'rejected')[0].reason.message + ' ' + paging_result.filter(o => o.status === 'rejected')[0].reason?.response?.statusText);
            }

            return {
                code: "ok",
                meesage: "Interface Batch Success!"
            };


        } catch (e) {
            return {
                code: "error",
                meesage: e.message
            };
        }

    })

    // return oReturn;
}
