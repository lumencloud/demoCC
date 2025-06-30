const cds = require('@sap/cds');
const { createLogger } = require('../util/logger');

/**
 * 데이터 조회 도구
 */
class DataFetcher {
    constructor() {
        this.logger = createLogger('data-fetcher');
        this.availableFunctions = {
            'get_actual_sale_org_pl': {
                description: '실적PL 매출/마진-조직별 데이터 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_actual_sale_org_pl')
            },
            'get_actual_sale_account_pl': {
                description: '실적PL 매출/마진-Account 데이터 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_actual_sale_account_pl')
            },
            'get_actual_sale_relsco_pl': {
                description: '실적PL 매출/마진-대내/대외 데이터 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_actual_sale_relsco_pl')
            },
            'get_actual_sale_crov_pl': {
                description: '실적PL 매출/마진-신규/이월 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_actual_sale_crov_pl')
            },
            'get_actual_sga': {
                description: '실적PL SG&A 데이터 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../sga/get_actual_sga')
            },
            'get_actual_dt_org_oi': {
                description: '실적PL DT 매출-조직별 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_actual_dt_org_oi')
            },
            'get_actual_dt_account_oi': {
                description: '실적PL DT 매출-Account 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_actual_dt_account_oi')
            },
            'get_actual_br_org_detail': {
                description: '실적PL BR 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_actual_br_org_detail')
            },
            'get_actual_rohc_org_oi': {
                description: '실적PL RoHC 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_actual_rohc_org_oi')
            },
            'get_forecast_m_pl': {
                description: '월별 추정 미확보PL 데이터 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_forecast_m_pl')
            },
            'get_forecast_pl_pipeline_detail': {
                description: '추정PL Pipeline 상세 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_forecast_pl_pipeline_detail')
            },
            'get_forecast_pl_sale_margin_org_detail': {
                description: '추정PL 매출/마진-조직별 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_forecast_pl_sale_margin_org_detail')
            },
            'get_forecast_pl_sale_margin_account_detail': {
                description: '추정PL 매출/마진-Account 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_forecast_pl_sale_margin_account_detail')
            },
            'get_forecast_pl_sale_margin_crov_detail': {
                description: '추정PL 매출/마진-대내/대외 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_forecast_pl_sale_margin_crov_detail')
            },
            'get_forecast_pl_sale_margin_over_detail': {
                description: '추정PL 매출/마진-신규/이월 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_forecast_pl_sale_margin_relsco_detail')
            },
            'get_forecast_dt_org_oi': {
                description: '추정PL DT 매출-조직별 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_forecast_dt_org_oi')
            },
            'get_forecast_dt_account_oi': {
                description: '추정PL DT 매출-Account 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_forecast_dt_account_oi')
            },
            'get_forecast_br_org_detail': {
                description: '추정PL BR 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_forecast_br_org_detail')
            },
        };
    }

    /**
     * 사용 가능한 함수 목록 반환
     * @returns {Array} 사용 가능한 함수들의 정보
     */
    getAvailableFunctions() {
        return Object.keys(this.availableFunctions).map(name => ({
            name: name,
            description: this.availableFunctions[name].description,
            required_params: this.availableFunctions[name].params
        }));
    }

    /**
     * 함수 실행 - 메인 진입점
     */
    async executeFunction(functionName, params) {
        try {
            if (!this.availableFunctions[functionName]) {
                throw new Error(`Function '${functionName}' not found`);
            }

            const funcInfo = this.availableFunctions[functionName];
            
            // 필수 파라미터 체크
            for (const param of funcInfo.params) {
                if (!params[param]) {
                    throw new Error(`Missing required parameter: ${param}`);
                }
            }

            // 기존 핸들러 호출
            const result = await this.callHandler(funcInfo.handler, params);

            return {
                success: true,
                function_name: functionName,
                data: result,
                executed_at: new Date().toISOString()
            };

        } catch (error) {
            return {
                success: false,
                function_name: functionName,
                error: error.message,
                executed_at: new Date().toISOString()
            };
        }
    }

    /**
     * HTTP API 호출 실행
     */
    async callHandler(handler, params) {
        return new Promise((resolve, reject) => {
            const mockSrv = {
                on: (eventName, handlerFunc) => {
                    handlerFunc({ data: params })
                        .then(resolve)
                        .catch(reject);
                }
            };
            
            handler(mockSrv);
        });
    }
}

module.exports = DataFetcher;