const { func } = require('@sap/cds/lib/ql/cds-ql');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');

module.exports = (srv) => {
    srv.on('execute_pipeline_batch', async (req) => {
        const { ver, cust_param } = req.data;

        const tx_main = cds.tx(req);
        const tx_ver = cds.tx();
        const tx_trsf = cds.tx();
        const db = await cds.connect.to('db');
        const common_version_sfdc = db.entities('common').version_sfdc;
        const common_interface_log = db.entities('common').interface_log;

        const now = new Date();
        const sfdc_year = (now.getFullYear()).toString();
        const sfdc_month = (now.getMonth() + 1).toString().padStart(2, '0');
        const sfdc_date = String(now.getDate()).padStart(2, '0');

        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const offset = (firstOfMonth.getDay() + 6) % 7;
        const sfdc_week = Math.ceil((sfdc_date + offset) / 7);

        /**
         * hanlder 에서 인터페이스 로그 처리 함수
         */
                const Insert_log = async (step, source, table, procedure_name, success, log, err_cd) => {
                    await tx_main.run(INSERT([{
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
            const ver_info = await SELECT.one.from(common_version_sfdc).columns('ver_sfdc').where({ year: sfdc_year, month: sfdc_month }).orderBy('modifiedAt desc, ver desc');

            // 버전코드 기본형태
            let ver_no = `D${sfdc_year}${sfdc_month}01`

            if (ver) {  // 버전을 api 파라미터로 받을 경우 (temp)
                ver_no = ver;
            } else {
                if (ver_info) { // 이번 달 최신 버전이 존재 할 경우, [최신 버전 + 1] 신규 버전코드 생성
                    ver_no = ver_info.ver_sfdc.substring(0, 7) + (Number(ver_info.ver_sfdc.slice(7)) + 1).toString().padStart(2, '0');
                }
                // [step-2 신규 버전코드 등록]
                await tx_ver.run(INSERT([{
                    if_id: func('SYSUUID')[0], ver_sfdc: ver_no, year: sfdc_year, month: sfdc_month, week: sfdc_week, day: sfdc_date, tag: 'P'
                }]).into(common_version_sfdc));

                await tx_ver.commit();
            }

            const cal_dt = ver_no.substring(1, 7) + sfdc_date + '0' + ver_no.substring(7, 9);
            let oData = {
                VER: ver,
                'cal_dt__c': `${cal_dt}`
            };
            if(cust_param) oData['cal_dt__c'] = cust_param;

            let oRequestInfo = { destinationName: 'ERP_IT_CAP' };
            if (process.env.NODE_ENV !== 'production') {
                oRequestInfo = { url: 'http://localhost:5000' }
            }

            const RCV_PARAM = {
                if_step: 'RCV',
                api: '/http/SF6001',
                source: 'SFDC',
                table_name: 'PL_IF_SFDC',
                procedure_name: 'P_IF_PL_SFDC_RCV',
            };
            const TRSF_PARAM = {
                if_step: 'TRSF',
                source: 'PL_IF_SFDC_PIPELINE',
                table_name: 'PL_SFDC_CONTRACT',
                procedure_name: 'P_IF_PL_SFDC_PIPELINE_TRSF',
            };

            await executeHttpRequest(
                oRequestInfo,
                {
                    method: 'post',
                    url: RCV_PARAM.api,
                    data: oData
                },
                {
                    fetchCsrfToken: true
                }
            ).then(res => {
                // 200 ok 로 에러메시지가 넘어오는 경우..
                if (res.data.returnCode === 'E') {
                    Insert_log(RCV_PARAM.if_step, RCV_PARAM.source, RCV_PARAM.table_name, RCV_PARAM.procedure_name, false, err.response?.data?.message?.slice(0, 500), err.response?.data?.message.match(/\[(\d+)\]/)?.[1] ?? null);
                    throw new Error(res.data?.message);
                }
            }).catch(err => {
                if (err.status === 500) {
                    Insert_log(RCV_PARAM.if_step, RCV_PARAM.source, RCV_PARAM.table_name, RCV_PARAM.procedure_name, false, err.response?.data?.message?.slice(0, 500), err.response?.data?.message.match(/\[(\d+)\]/)?.[1] ?? null);
                    throw new Error(err.response?.data?.message);
                } else {
                    let err_text = err.request.path + ' -- ' + err.request.method + ' -- ' + err.message + ' -- ' + err.stack;
                    Insert_log(RCV_PARAM.if_step, RCV_PARAM.source, RCV_PARAM.table_name, RCV_PARAM.procedure_name, false, err_text.slice(0, 500), null);
                    throw new Error(err_text);
                }
            });

            await tx_trsf.run(`CALL ${TRSF_PARAM.procedure_name}( VER => '${ver_no}', O_RESULT => ? )`)
                .then(res => {
                    if (res.O_RESULT.find(o => o.RESULT_CODE === 'NG')) {
                        throw new Error(res.O_RESULT.find(o => o.RESULT_CODE === 'NG').SQL_ERROR_MESSAGE);
                    }
                })
                .catch(err => {
                    // Insert_log(TRSF_PARAM.if_step, TRSF_PARAM.source, TRSF_PARAM.table_name, RCV_PARAM.procedure_name, false, err.message?.slice(0, 500), err.code);
                    throw new Error(err);
                });

            let oReturn = {
                code: "ok",
                message: "Interface Batch Success!"
            }

            await tx_trsf.commit();
            await tx_main.run(UPDATE(common_version_sfdc).set({ tag: 'P' }).where({ tag: 'C' }));
            await tx_main.run(UPDATE(common_version_sfdc).set({ tag: 'C' }).where({ ver_sfdc: ver_no }));
            return oReturn;

        } catch (e) {
            // 해당 버전 실행 Error 처리
            // await tx_main.run(UPDATE(common_version_sfdc).set({ tag: 'E' }).where({ ver_sfdc: ver_no }));
            await tx_trsf.commit();
            return { code: "error", message: e.message };
        }


    })
}
