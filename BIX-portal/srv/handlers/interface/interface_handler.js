const cds = require('@sap/cds');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const { func } = require('@sap/cds/lib/ql/cds-ql');
const { exists } = require('@sap/cds/lib/utils/cds-utils');
const { promises } = require('fs');
const { scheduler } = require('timers/promises');

module.exports = class InterfaceService extends cds.ApplicationService {

  init() {

    // BIX_transfer_check
    const BIX_transfer_check = require('./BIX_transfer_check');
    BIX_transfer_check(this);

    // sfdc 핸들러 코드
    const call_sfdc_interface_api = require('./call_sfdc_interface_api');
    call_sfdc_interface_api(this);

    // 인터페이스 수행 API 실행 핸들러 로직
    this.on('execute_if_tester', async (req) => {
      const CommonInterfaceService = await cds.connect.to('CommonInterfaceService');

      const db = await cds.connect.to('db');
      const { batch_list } = req.data;
      const tx_main = cds.tx(req);

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
        let oRequestInfo = { destinationName: 'ERP_HTTP_DEST' };
        if (process.env.NODE_ENV !== 'production') {
          oRequestInfo = { url: 'http://localhost:5000' }
        }

        // IS API 호출 방식
        if (RCV_PARAM.is_yn) {
          let oData = {
            VER: ver_no
          };
          if (RCV_PARAM.api_parameter === 'YEAR_MONTH') {
            oData = { ...oData, 'YEAR_MONTH': '202412' } //`${year}${month}`
          } else if (RCV_PARAM.api_parameter === 'cal_dt__c') {
            oData = { ...oData, 'cal_dt__c': '250425001' }
          }

          return await executeHttpRequest(
            oRequestInfo,
            {
              method: 'post',
              url: RCV_PARAM.api,
              data: oData
            },
            {
              fetchCsrfToken: false
            }
          ).then(res => {
            // 200 ok 로 에러메시지가 넘어오는 경우..
            if (res.data.returnCode === 'E') {
              Insert_log(RCV_PARAM.if_step, RCV_PARAM.source, RCV_PARAM.table_name, RCV_PARAM.procedure_name, false, res.data?.message.slice(0, 500), null);
              throw new Error(res.data?.message);
            }
          }).catch(err => {
            Insert_log(RCV_PARAM.if_step, RCV_PARAM.source, RCV_PARAM.table_name, RCV_PARAM.procedure_name, false, err.response?.data?.message.slice(0, 500), err.response?.data?.message.match(/\[(\d+)\]/)?.[1] ?? null);
            throw new Error(err.response?.data?.message);
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
                fetchCsrfToken: false
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
              fetchCsrfToken: false
            }
          );

          for (let i = 0; i < dataCount.data / 100; i++) {
            call_list.push(RCV_PARAM.api + '?$skiptoken=' + i * 100);
          }

          const paging_result = await Promise.allSettled(call_list.map(pageUri => requestData(pageUri)))
          if (paging_result.filter(o => o.status === 'rejected').length > 0) {
            throw new Error();
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
              throw new Error(res.O_RESULT.find(o => o.RESULT_CODE === 'NG').SQL_ERROR_MESSAGE);
            }
          })
          .catch(err => { 
            // Insert_log(TRSF_PARAM.if_step, TRSF_PARAM.source, TRSF_PARAM.table_name, RCV_PARAM.procedure_name, false, err.message?.slice(0, 500), err.code);
            throw new Error(err);
          });
      }

      try {
        // [step-1 버전코드 생성]
        // 이번 달 최신 버전정보 조회
        const ver_info = await SELECT.one.from(common_version)
          .where({ year: year, month: month, tag: 'C' })
          .orderBy('ver desc');

        ver_no = ver_info.ver;

        let Interface_list_query = SELECT.from(common_interface_master).where({ use_yn: true, dev_complete_yn: true });
        for (let i = 0; i < batch_list.length; i++) {
          if (i === 0) {
            Interface_list_query = Interface_list_query.and(batch_list[i]);
          } else {
            Interface_list_query = Interface_list_query.or(batch_list[i]);
          }
        }

        /**
         * 인터페이스 마스터 정보 조회
         */
        const Interface_list = await cds.run(Interface_list_query);

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
        ?.filter(o=> {
          if(seen.has(o.procedure_name)) return false;
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
          for(const errList of RCV_results.filter(o => o.status === 'rejected')){
            err_text += ' \n ' + errList.reason.message
          }
          throw new Error(err_text);
        }

        await tx_rcv.commit();

        // [step-5 TRSF 실행]
        for (const executeGroup of TRSF_Execute_list) {
          const TRSF_results = await Promise.allSettled(
            executeGroup.list.map(TRSF_PARAM => TRSF_func(TRSF_PARAM))
          )
          // 에러 발생시 중단
          if (TRSF_results.filter(o => o.status === 'rejected').length > 0) {
            let err_text = '';
            for(const errList of TRSF_results.filter(o => o.status === 'rejected')){
              err_text += ' \n ' + errList.reason.message
            }
            throw new Error(err_text);
          }
        }

        await tx_rcv.commit();
        await tx_trsf.commit();
        return "Interface Batch Success!"

      } catch (e) {
        await tx_rcv.commit();
        await tx_trsf.commit();
        return { error: e.message };
      }
    })

    // 인터페이스 수행 API 실행 핸들러 로직
    this.on('execute_interface', async (req) => {
      const CommonInterfaceService = await cds.connect.to('CommonInterfaceService');

      const db = await cds.connect.to('db');
      const { ver } = req.data;
      const tx_main = cds.tx(req);
      /**
       * 버전코드 처리 트랜젝션
       */
      const tx_ver = cds.tx();
      /**
       * 인터페이스 수행 트랜젝션
       */
      const tx_rcv = cds.tx();
      const tx_trsf= cds.tx();
      const common_version = db.entities('common').version;
      const common_interface_log = db.entities('common').interface_log;
      const common_interface_master = db.entities('common').interface_master;
      const pl_if_wg = db.entities('pl').if_wg;
      const sc_if_expense = db.entities('sc').if_expense;
      const sc_if_labor = db.entities('sc').if_labor;
      const sc_if_pl = db.entities('sc').if_pl;

      const now = new Date();
      const year = (now.getMonth() === 0 ? (now.getFullYear() - 1) : now.getFullYear()).toString();
      const month = (now.getMonth() === 0 ? 12 : now.getMonth()).toString().padStart(2, '0'); // 인터페이스 시점 직전 월

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
          procedure_name : procedure_name,
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
        let oRequestInfo = { destinationName: 'ERP_HTTP_DEST' };
        if (process.env.NODE_ENV !== 'production') {
          oRequestInfo = { url: 'http://localhost:5000' }
        }

        // IS API 호출 방식
        if (RCV_PARAM.is_yn) {
          let oData = {
            VER: ver_no
          };
          if (RCV_PARAM.api_parameter === 'YEAR_MONTH') {
            oData = { ...oData, 'YEAR_MONTH': '202412' } //`${year}${month}`
          } else if (RCV_PARAM.api_parameter === 'cal_dt__c') {
            oData = { ...oData, 'cal_dt__c': '250425001' }
          }

          return await executeHttpRequest(
            oRequestInfo,
            {
              method: 'post',
              url: RCV_PARAM.api,
              data: oData
            },
            {
              fetchCsrfToken: false
            }
          ).then(res => {
            // 200 ok 로 에러메시지가 넘어오는 경우..
            if (res.data.returnCode === 'E') {
              Insert_log(RCV_PARAM.if_step, RCV_PARAM.source, RCV_PARAM.table_name, RCV_PARAM.procedure_name, false, res.data?.message.slice(0, 500), null);
              throw new Error(err);
            }
          }).catch(err => {
            Insert_log(RCV_PARAM.if_step, RCV_PARAM.source, RCV_PARAM.table_name, RCV_PARAM.procedure_name, false, err.response?.data?.message.slice(0, 500), err.response?.data?.message.match(/\[(\d+)\]/)?.[1] ?? null);
            throw new Error(err);
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
                fetchCsrfToken: false
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
                throw new Error(err);
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
              fetchCsrfToken: false
            }
          );

          for (let i = 0; i < dataCount.data / 100; i++) {
            call_list.push(RCV_PARAM.api + '?$skiptoken=' + i * 100);
          }

          const paging_result = await Promise.allSettled(call_list.map(pageUri => requestData(pageUri)))
          if (paging_result.filter(o => o.status === 'rejected').length > 0) {
            throw new Error();
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
        const [check_wg, check_sc_expense, check_sc_labor, check_sc_pl] = await Promise.all([
          await SELECT.one.from(pl_if_wg).where({ year: year, month: month, flag: null }),
          await SELECT.one.from(sc_if_expense).where({ year: year, month: month, flag: null }),
          await SELECT.one.from(sc_if_labor).where({ year: year, month: month, flag: null }),
          await SELECT.one.from(sc_if_pl).where({ year: year, month: month, flag: null })
        ])

        // wg 없으면 실패처리 -- 데이터 체크 기준을 year: year, month: month, flag : null
        if (!check_wg) {
          Insert_log('DIRECT', 'WG', 'PL_IF_WG', null, false, 'WG data are not updated yet');
          // throw new Error('WG data are not updated yet');
        } else {
          Insert_log('DIRECT', 'WG', 'PL_IF_WG', null,true, null);
        }
        // 자회사 데이터 존재 여부 체크
        if (!check_sc_expense) {
          Insert_log('DIRECT', 'SC', 'SC_IF_EXPENSE', null, false, 'SC Expense data are not updated yet');
        } else {
          Insert_log('DIRECT', 'SC', 'SC_IF_EXPENSE', null, true, null);
        }

        if (!check_sc_labor) {
          Insert_log('DIRECT', 'SC', 'SC_IF_LABOR', null, false, 'SC Labor data are not updated yet');
        } else {
          Insert_log('DIRECT', 'SC', 'SC_IF_LABOR', null, true, null);
        }

        if (!check_sc_pl) {
          Insert_log('DIRECT', 'SC', 'SC_IF_PL', null, false, 'SC PL data are not updated yet');
        } else {
          Insert_log('DIRECT', 'SC', 'SC_IF_PL', null, true, null);
        }

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
        const TRSF_Execute_list = Object.values(
          Interface_list.filter(o => o.if_step === 'TRSF').reduce((acc, curr) => {
            const group = curr.execute_order;
            if (!acc[group]) {
              acc[group] = { execute_order: group, list: [] };
            }
            acc[group].list.push(curr);
            return acc;
          }, {})
        );
        TRSF_Execute_list.sort((a, b) => b.execute_order - a.execute_order);

        // [step-4 RCV 실행]
        const RCV_results = await Promise.allSettled(
          RCV_Execute_list.map(RCV_PARAM => RCV_func(RCV_PARAM))
        );

        // 에러 발생시 중단
        if (RCV_results.filter(o => o.status === 'rejected').length > 0) {
          let err_text = '';
          for(const errList of RCV_results.filter(o => o.status === 'rejected')){
            err_text += ' \n ' + errList.reason.message
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
            for(const errList of TRSF_results.filter(o => o.status === 'rejected')){
              err_text += ' \n ' + errList.reason.message
            }
            throw new Error(err_text);
          }
        }

        await tx_rcv.commit();
        await tx_trsf.commit();
        return "Interface Batch Success!"

      } catch (e) {
        // 해당 버전 실행 Error 처리
        await tx_main.run(UPDATE(common_version).set({ tag: 'E' }).where({ ver: ver_no }));
        await tx_rcv.rollback();
        await tx_trsf.commit();
        return { error: e.message };
      }
    })

    this.on('call_interface_api', async (req) => {
      const CommonInterfaceService = await cds.connect.to('CommonInterfaceService');

      const db = await cds.connect.to('db');
      const { ver } = req.data;
      const tx = cds.tx();
      const tx2 = cds.tx(req);
      const common_version = db.entities('common').version;

      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth()).toString().padStart(2, '0'); // 인터페이스 시점 직전 월

      let ver_no = '';

      try {
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
            if_id: func('SYSUUID')[0], ver: ver_no, year: year, month: month, tag: 'C'
          }]).into(common_version));

          await tx_ver.commit();
        } else {
          ver_no = ver;
        }

        // [step-3 RCV 인터페이스 실행]
        const [
          // call_if_commitment_item_erp,
          // call_if_customer,
          call_if_gl_account_erp,
          // call_if_org,
          // call_if_org_map,
          // call_if_project,
          // call_if_project_os_erp
        ] = await Promise.all([
          // await CommonInterfaceService.call_if_commitment_item_erp({ver: ver}),
          // await CommonInterfaceService.call_if_customer(),
          await CommonInterfaceService.call_if_gl_account_erp({ ver: ver_no }),
          // await CommonInterfaceService.call_if_org(),
          // await CommonInterfaceService.call_if_org_map(),
          // await CommonInterfaceService.call_if_project(),
          // await CommonInterfaceService.call_if_project_os_erp()
        ])

        // [step-4 인터페이스 수행결과 체크 / 성공시 tag (S/C) 업데이트]
        // 인터페이스 프로시저 처리 성공시 버전테이블 업데이트
        // if(!call_if_commitment_item_erp.error
        // && !call_if_customer.error
        // && !call_if_gl_account.error
        // && !call_if_org.error
        // && !call_if_org_map.error
        // && !call_if_project.error
        // && !call_if_project_os_erp.error
        // &&
        // call_if_commitment_item.O_RESULT[0].ERROR_TYPE === "FINISH" &&
        // call_if_customer.O_RESULT[0].ERROR_TYPE === "FINISH" &&
        // call_if_gl_account.O_RESULT[0].ERROR_TYPE === "FINISH" &&
        // call_if_org.O_RESULT[0].ERROR_TYPE === "FINISH" &&
        // call_if_org_map.O_RESULT[0].ERROR_TYPE === "FINISH" // &&
        // call_if_project.O_RESULT[0].ERROR_TYPE === "FINISH" &&
        // call_if_project_os_erp.O_RESULT[0].ERROR_TYPE === "FINISH"
        // ){

        // // 올해 인터페이스 기존 버전 tag - 'C' 업데이트
        // await tx_if.run(UPDATE(common_version).set({tag : 'C'}).where({tag : 'F', year : year}));
        // // 인터페이스 신규 버전 tag - 'F' 업데이트
        // await tx_if.run(UPDATE(common_version).set({tag : 'F'}).where({ver : ver_no}));
        // }

        // [step-5 인터페이스 api 종료]
        return [
          // call_if_commitment_item_erp,
          // call_if_customer,
          call_if_gl_account_erp,
          // call_if_org,
          // call_if_org_map,
          // call_if_project,
          // call_if_project_os_erp
        ]

      } catch (e) {
        console.log(e);
        return { error: e.message };
      }
    })

    return super.init()
  }
}
