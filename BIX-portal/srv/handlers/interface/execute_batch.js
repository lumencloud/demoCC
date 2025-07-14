const { func } = require('@sap/cds/lib/ql/cds-ql');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');

module.exports = (srv) => {
    srv.on('execute_batch', async (req) => {

        const db = await cds.connect.to('db');
        const { ver, cust_param } = req.data;
        const tx_main = cds.tx(req);
        /**
         * 버전코드 처리 트랜젝션
         */
        const tx_ver = cds.tx();
        /**
         * 인터페이스 수행 트랜젝션
         */
        const tx_rcv = cds.tx();
        const tx_trsf = cds.tx();
        const common_version = db.entities('common').version;
        const common_interface_log = db.entities('common').interface_log;
        const common_interface_master = db.entities('common').interface_master;
        
        const now = new Date();
        const year = (now.getMonth() === 0 ? (now.getFullYear() - 1) : now.getFullYear()).toString();
        const month = (now.getMonth() === 0 ? 12 : now.getMonth()).toString().padStart(2, '0'); // 인터페이스 시점 직전 월
        const sfdc_year = (now.getFullYear()).toString();
        const sfdc_month = (now.getMonth() + 1).toString().padStart(2, '0');
        const sfdc_date = String(now.getDate()).padStart(2, '0');

        let ver_no = '';

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

        /**
         * RCV IS인터페이스 API 호출 or ERP I/F API 호출 + I/F RCV 프로시저 실행 공통함수
         */
        const RCV_func = async (RCV_PARAM) => {

            // 트랜젝션 실행

            let destinationName = '';
            if(RCV_PARAM.is_yn){
                destinationName = 'ERP_IT_CAP'
            } else {
                destinationName = 'ERP_HTTP_DEST'
            }
            let oRequestInfo = { destinationName: `${destinationName}` };
            if (process.env.NODE_ENV !== 'production') {
                oRequestInfo = { url: 'http://localhost:5000' }
            }

            // IS API 호출 방식
            if (RCV_PARAM.is_yn) {
                let oData = {
                    VER: ver_no
                };
                if (RCV_PARAM.api_parameter === 'YEAR_MONTH') {
                    oData = { ...oData, 'YEAR_MONTH': `${year}${month}` }
                    if(cust_param) oData['YEAR_MONTH'] = cust_param;
                } else if (RCV_PARAM.api_parameter === 'cal_dt__c') {
                    const cal_dt = sfdc_year.slice(2, 4) + sfdc_month + sfdc_date + '001';
                    oData = { ...oData, 'cal_dt__c': `${cal_dt}` }
                    if(cust_param) oData['cal_dt__c'] = cust_param;
                }

                return await executeHttpRequest(
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
                        Insert_log(RCV_PARAM.if_step, RCV_PARAM.source, RCV_PARAM.table_name, RCV_PARAM.procedure_name, false, res.data?.message.slice(0, 500), null);
                        throw new Error(err);
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

                // 페이징 데이터 병렬 요청 후 수행 (ERP)
            } else {
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
                    await tx_rcv.run(`CALL ${RCV_PARAM.procedure_name}( VER => '${ver_no}', JSONDATA => ? )`, [IF_STRING_JSON])
                        .catch(err => {
                            Insert_log(RCV_PARAM.if_step, RCV_PARAM.source, RCV_PARAM.table_name, RCV_PARAM.procedure_name, false, err.message?.slice(0, 500), err.code);
                            throw new Error(err.message);
                        });
                }

                const call_list = [];

                const dataCount = await executeHttpRequest(
                    oRequestInfo,
                    {
                        method: 'get',
                        url: RCV_PARAM.api + '/$count',
                        headers: {
                            Accept: 'application/json'
                        }
                    },
                    {
                        fetchCsrfToken: true
                    }
                );

                if (RCV_PARAM.api_parameter) {
                    RCV_PARAM.api = RCV_PARAM.api + "?" + RCV_PARAM.api_parameter.replace("YYYY", `'${year}'`).replace("MM", `'${month}'`);
                    if(cust_param) RCV_PARAM.api = RCV_PARAM.api + "?" + RCV_PARAM.api_parameter.replace("YYYY", cust_param.substr(0,4)).replace("MM", cust_param.substr(4,2));
                    // RCV_PARAM.api = RCV_PARAM.api + "?$filter=(Gjahr eq '2025' and Monat eq '5') or (Gjahr eq '2024' and Monat eq '13')";
                }

                const paging_size = 1000;
                for (let i = 0; i < dataCount.data / paging_size; i++) {
                    let sPath = RCV_PARAM.api;
                    if (RCV_PARAM.api_parameter) {
                        sPath = RCV_PARAM.api + '&$top=' + paging_size + '&$skip=' + i * paging_size;
                    } else {
                        sPath = RCV_PARAM.api + '?$top=' + paging_size + '&$skip=' + i * paging_size;
                    }
                    call_list.push(sPath);
                }

                const paging_result = await Promise.allSettled(call_list.map(pageUri => requestData(pageUri)))
                if (paging_result.filter(o => o.status === 'rejected').length > 0) {
                    // 에러메시지 정리
                    throw new Error(paging_result.filter(o => o.status === 'rejected')[0].reason.message + ' ' + paging_result.filter(o => o.status === 'rejected')[0].reason?.response?.statusText);
                }
            }
        };

        /**
         * TRSF 배치 실행 함수
         */
        const TRSF_func = async (TRSF_PARAM) => {
            await tx_trsf.run(`CALL ${TRSF_PARAM.procedure_name}( VER => '${ver_no}', O_RESULT => ? )`)
                .then(res => {
                    if (res.O_RESULT.find(o => o.RESULT_CODE === 'NG')) {
                        throw new Error(res.O_RESULT.find(o => o.RESULT_CODE === 'NG'));
                    }
                })
                .catch(err => {
                    // Insert_log(TRSF_PARAM.if_step, TRSF_PARAM.source, TRSF_PARAM.table_name, RCV_PARAM.procedure_name, false, err.message?.slice(0, 500), err.code);
                    throw new Error(err);
                });
        }

        try {
            // 버전이 api 요청 파라미터에 없을 경우 job scheduler 사용으로 처리
            if (!ver) {
                // [step-1 버전코드 생성]
                // 이번 달 최신 버전정보 조회
                const ver_info = await SELECT.one.from(common_version)
                    .where({ year: year, month: month })
                    .orderBy('ver desc');

                ver_no = `P${year}${month}01`
                // 이번 달 최신 버전이 존재 할 경우, [최신 버전 + 1] 신규 버전코드 생성
                if (ver_info) {
                    ver_no = ver_info.ver.substring(0, 7) + (Number(ver_info.ver.slice(7)) + 1).toString().padStart(2, '0');
                }

                // [step-2 신규 버전코드 등록]
                await tx_ver.run(INSERT([{
                    if_id: func('SYSUUID')[0], ver: ver_no, year: year, month: month, tag: 'I', auto_yn: true
                }]).into(common_version));

                await tx_ver.commit();
            } else {
                ver_no = ver;
            }

            // [step-3 WG, SC 실적 등록 확인]
            // const [check_wg, check_sc_expense, check_sc_labor, check_sc_pl] = await Promise.all([
            //     await SELECT.one.from(pl_if_wg).where({ year: year, month: month, flag: null }),
            //     await SELECT.one.from(sc_if_expense).where({ year: year, month: month, flag: null }),
            //     await SELECT.one.from(sc_if_labor).where({ year: year, month: month, flag: null }),
            //     await SELECT.one.from(sc_if_pl).where({ year: year, month: month, flag: null })
            // ])

            // // wg 없으면 실패처리 -- 데이터 체크 기준을 year: year, month: month, flag : null
            // if (!check_wg) {
            //     Insert_log('DIRECT', 'WG', 'PL_IF_WG', null, false, 'WG data are not updated yet');
            //     // throw new Error('WG data are not updated yet');
            // } else {
            //     Insert_log('DIRECT', 'WG', 'PL_IF_WG', null, true, null);
            // }
            // // 자회사 데이터 존재 여부 체크
            // if (!check_sc_expense) {
            //     Insert_log('DIRECT', 'SC', 'SC_IF_EXPENSE', null, false, 'SC Expense data are not updated yet');
            // } else {
            //     Insert_log('DIRECT', 'SC', 'SC_IF_EXPENSE', null, true, null);
            // }

            // if (!check_sc_labor) {
            //     Insert_log('DIRECT', 'SC', 'SC_IF_LABOR', null, false, 'SC Labor data are not updated yet');
            // } else {
            //     Insert_log('DIRECT', 'SC', 'SC_IF_LABOR', null, true, null);
            // }

            // if (!check_sc_pl) {
            //     Insert_log('DIRECT', 'SC', 'SC_IF_PL', null, false, 'SC PL data are not updated yet');
            // } else {
            //     Insert_log('DIRECT', 'SC', 'SC_IF_PL', null, true, null);
            // }

            /**
             * 인터페이스 마스터 정보 조회
             */
            const Interface_list = await SELECT.from(common_interface_master).where({ use_yn: true, dev_complete_yn: true, represent_yn: true });
            /**
             * RCV 프로시저 - 순서 상관없시 병렬실행
             */
            const RCV_Execute_list = Interface_list.filter(o => o.if_step === 'RCV');
            /**
             * TRSF 프로시저 - execute_order 별 순서대로 수행
             */
            const seen = new Set();
            const TRSF_raw_list = Interface_list
                .filter(o => o.if_step === 'TRSF')
                ?.sort((a, b) => Number(b.represent_yn) - Number(a.represent_yn))
                ?.filter(o => {
                    if (seen.has(o.procedure_name)) return false;
                    seen.add(o.procedure_name);
                    return true;
                });

            const TRSF_Execute_list = Object.values(
                TRSF_raw_list.reduce((acc, curr) => {
                    const group = curr.execute_order;
                    if (!acc[group]) {
                        acc[group] = { execute_order: group, list: [] };
                    }
                    acc[group].list.push(curr);
                    return acc;
                }, {})
            )?.sort((a, b) => b.execute_order - a.execute_order);

            // [step-4 RCV 실행]
            const RCV_results = await Promise.allSettled(
                RCV_Execute_list.map(RCV_PARAM => RCV_func(RCV_PARAM))
            );

            // 에러 발생시 중단
            if (RCV_results.filter(o => o.status === 'rejected').length > 0) {
                let err_text = '';
                for (const errList of RCV_results.filter(o => o.status === 'rejected')) {
                    err_text += errList.reason.message;
                }
                throw new Error(err_text);
            }

            // [step-5 TRSF 실행]
            for (const executeGroup of TRSF_Execute_list) {
                const TRSF_results = await Promise.allSettled(
                    executeGroup.list.map(TRSF_PARAM => TRSF_func(TRSF_PARAM))
                )
                // 에러 발생시 중단
                if (TRSF_results.filter(o => o.status === 'rejected').length > 0) {
                    let err_text = '';
                    for (const errList of TRSF_results.filter(o => o.status === 'rejected')) {
                        err_text += errList.reason?.stack.toString()
                    }
                    throw new Error(err_text);
                }
            }

            let oReturn = {
                code: "ok",
                message: "Interface Batch Success!"
            }

            await tx_rcv.commit();
            await tx_trsf.commit();
            return oReturn

        } catch (e) {
            // 해당 버전 실행 Error 처리
            await tx_main.run(UPDATE(common_version).set({ tag: 'E' }).where({ ver: ver_no }));
            await tx_rcv.rollback();
            await tx_trsf.commit();
            return { code: "error", message: e.message };
        }
    })
}
