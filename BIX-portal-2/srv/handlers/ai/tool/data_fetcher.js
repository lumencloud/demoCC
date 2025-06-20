const cds = require('@sap/cds');

/**
 * 데이터 조회 도구
 */
class DataFetcher {
    constructor() {
        this.availableFunctions = {
            'get_forecast_m_pl': {
                description: '월별 추정 미확보PL 데이터 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../pl/api/get_forecast_m_pl')
            },
            'get_actual_sga': {
                description: '실적PL SG&A 데이터 조회',
                params: ['year', 'month', 'org_id'],
                handler: require('../../sga/get_actual_sga')
            }
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