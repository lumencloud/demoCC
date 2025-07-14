const cds = require('@sap/cds');
const settings = require('../config/settings');
const { createLogger } = require('../util/logger');

/**
* 다중 데이터 조회 도구 (보고서 에이전트용)
* - 항상 병렬 처리
* - 에러 발생 시 해당 함수만 패스하고 계속 진행
*/
class DataMultiFetchTool {
    constructor() {
        this.logger = createLogger('data-multi-fetch-tool');
        this.apiConfigs = settings.dataFetcher.apis;
        this.defaultParams = settings.dataFetcher.defaultParams;
    }

    /**
     * 다중 함수 실행 메인 인터페이스
     * @param {Object} inputs - 입력 파라미터
     * @param {Array} inputs.functions - 실행할 함수 목록
     * @param {string} inputs.functions[].name - 함수명
     * @param {Object} inputs.functions[].params - 해당 함수의 파라미터
     * @param {Object} [inputs.global_params] - 모든 함수에 공통 적용될 파라미터
     * @returns {Promise<string>} JSON 형태의 실행 결과
     */
    async execute(inputs) {
        try {
            this.logger.info('DataMultiFetchTool 실행 시작');
            this.logger.debug('입력 파라미터:', inputs);

            // 입력값 검증
            this._validateInputs(inputs);

            const { functions, global_params = {} } = inputs;

            // 병렬 실행
            const results = await this._executeParallel(functions, global_params);

            this.logger.info('다중 데이터 수집 완료');
            return JSON.stringify(results, null, 2);
        } catch (error) {
            this.logger.error('DataMultiFetchTool 실행 실패:', error);
            
            // 에러 응답 구성
            const errorResponse = {
                success: false,
                functions: inputs.functions || [],
                error: error.message,
                executed_at: new Date().toISOString()
            };

            return JSON.stringify(errorResponse, null, 2);
        }
    }

    /**
     * 입력값 검증
     */
    _validateInputs(inputs) {
        if (!inputs.functions || !Array.isArray(inputs.functions)) {
            throw new Error('functions must be an array');
        }
    
        if (inputs.functions.length === 0) {
            throw new Error('At least one function must be specified');
        }
    
        inputs.functions.forEach((func, index) => {
            if (!func.name) {
                throw new Error(`name is required at index ${index}`);
            }
    
            if (!this.apiConfigs[func.name]) {
                throw new Error(`Function '${func.name}' not found in API configurations`);
            }
        });
    }
    
    /**
     * 병렬 실행 (에러 시 패스)
     */
    async _executeParallel(functions, globalParams) {
        this.logger.debug(`배치 병렬 실행 시작: ${functions.length}개 함수`);
        
        const BATCH_SIZE = 3; // 동시 실행 수 제한
        const finalResult = {};
        
        // 3개씩 배치로 나누어 처리
        for (let i = 0; i < functions.length; i += BATCH_SIZE) {
            const batch = functions.slice(i, i + BATCH_SIZE);
            this.logger.debug(`배치 ${Math.floor(i/BATCH_SIZE) + 1} 실행: ${batch.map(f => f.name).join(', ')}`);
            
            // 현재 배치의 함수들을 병렬 실행
            const batchPromises = batch.map(async (func) => {
                try {
                    const { name, params = {} } = func;
                    
                    // 파라미터 병합: 기본값 + 전역 파라미터 + 함수별 파라미터
                    const mergedParams = {
                        ...this.defaultParams,
                        ...globalParams,
                        ...params
                    };
    
                    const result = await this._executeSingleFunction(name, mergedParams);
                    const apiConfig = this.apiConfigs[name];
                    
                    return {
                        [name]: {
                            desc: apiConfig.description,
                            data: result
                        }
                    };
                } catch (error) {
                    // 에러 로깅하고 패스
                    this.logger.warn(`함수 실행 실패 (패스): ${func.name}`, error);
                    
                    return {
                        [func.name]: {
                            desc: this.apiConfigs[func.name]?.description || 'Unknown function',
                            success: false,
                            error: error.message,
                            executed_at: new Date().toISOString()
                        }
                    };
                }
            });
    
            // 현재 배치 완료 대기
            const batchResults = await Promise.allSettled(batchPromises);
            
            // 배치 결과를 최종 결과에 병합
            batchResults.forEach((promiseResult, batchIndex) => {
                const func = batch[batchIndex];
                const functionName = func.name;
                
                if (promiseResult.status === 'fulfilled') {
                    Object.assign(finalResult, promiseResult.value);
                }
                else {
                    // Promise 자체가 실패한 경우
                    const apiConfig = this.apiConfigs[functionName];
                    finalResult[functionName] = {
                        desc: apiConfig ? apiConfig.description : 'Unknown function',
                        success: false,
                        error: promiseResult.reason.message || 'Promise execution failed',
                        executed_at: new Date().toISOString()
                    };
                }
            });
            
            this.logger.debug(`배치 ${Math.floor(i/BATCH_SIZE) + 1} 완료`);
        }
    
        return finalResult;
    }
    
    /**
     * 단일 함수 실행
     */
    async _executeSingleFunction(functionName, params) {
        this.logger.debug(`함수 실행: ${functionName}`, { params });

        // API 설정 가져오기
        const apiConfig = this.apiConfigs[functionName];
        
        if (!apiConfig) {
            throw new Error(`Function '${functionName}' not found in settings`);
        }
        
        // 필수 파라미터 검증
        this.validateRequiredParams(apiConfig.params, params);
        
        // 핸들러 실행
        const handlerResult = await this.executeHandlerWithCDS(apiConfig.handlerPath, params);
        
        return handlerResult;
    }

    /**
     * 필수 파라미터 검증
     */
    validateRequiredParams(requiredParams, providedParams) {
        const missingParams = [];
        
        for (const param of requiredParams) {
            if (!providedParams[param] && providedParams[param] !== 0) {
                missingParams.push(param);
            }
        }

        if (missingParams.length > 0) {
            throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
        }
    }

    /**
     * CDS 핸들러 실행
     */
    async executeHandlerWithCDS(handlerPath, params) {
        try {
            const handler = require(handlerPath);
            this.logger.debug(`핸들러 로딩 완료: ${handlerPath}`);
            
            if (typeof handler !== 'function') {
                throw new Error(`Handler is not a function: ${handlerPath}`);
            }

            const srv = new cds.ApplicationService();
            srv.db = await cds.connect.to('db');

            return new Promise((resolve, reject) => {
                srv.on('*', async (req) => {
                    try {
                        req.data = params;
                        
                        const tempSrv = {
                            on: (eventName, handlerFunc) => {
                                handlerFunc(req)
                                    .then(resolve)
                                    .catch(reject);
                            }
                        };

                        handler(tempSrv);
                    } catch (error) {
                        reject(error);
                    }
                });

                srv.emit('custom_event', { data: params });
            });
        } catch (requireError) {
            this.logger.error(`핸들러 로딩 실패: ${handlerPath}`, requireError);
            throw new Error(`Failed to load handler: ${handlerPath} - ${requireError.message}`);
        }
    }
}

module.exports = DataMultiFetchTool;