const cds = require('@sap/cds');
const settings = require('../config/settings');
const { createLogger } = require('../util/logger');

/**
* 다중 데이터 조회 도구 (보고서 컨텐츠 에이전트용)
* - 항상 병렬 처리
* - 에러 발생 시 해당 함수만 패스하고 계속 진행
* - 시간이 오래 걸리는 함수는 타임아웃으로 처리
*/
class DataMultiFetchTool {
    constructor() {
        this.logger = createLogger('data-multi-fetch-tool');
        this.apiConfigs = settings.dataFetcher.apis;
        this.defaultParams = settings.dataFetcher.defaultParams;
        this.sharedDb = null; // 공유 DB 커넥션
        
        // 타임아웃 설정 (초 단위)
        this.functionTimeout = 30; // 30초 타임아웃
        this.maxRetries = 1; // 최대 재시도 횟수
    }

    /**
     * 다중 함수 실행 메인 인터페이스
     */
    async execute(inputs) {
        try {
            this.logger.info('DataMultiFetchTool 실행 시작');
            
            // 공유 DB 커넥션 초기화
            this.sharedDb = await cds.connect.to('db');
            
            this._validateInputs(inputs);
            const { functions, global_params = {} } = inputs;
    
            // 병렬 실행 (타임아웃 및 에러 처리 포함)
            const results = await this._executeParallelWithTimeout(functions, global_params);
    
            this.logger.info('DataMultiFetchTool 실행 완료');
            // this.logger.debug('반환할 결과 타입:', typeof results);
            // this.logger.debug('반환할 결과 키들:', Object.keys(results || {}));
            
            // DB 연결 해제 후 결과 반환
            if (this.sharedDb) {
                this.sharedDb.disconnect();
                this.logger.debug('공유 DB 커넥션 해제 완료');
            }
            
            return JSON.stringify(results, null, 2);
        } catch (error) {
            this.logger.error('DataMultiFetchTool 실행 실패:', error);
            
            // 에러 시에도 DB 연결 해제
            if (this.sharedDb) {
                this.sharedDb.disconnect();
            }
            
            const errorResponse = {
                success: false,
                functions: inputs.functions || [],
                error: error.message,
                executed_at: new Date().toISOString()
            };

            return errorResponse;
        }
    }

    /**
    * 순차 실행으로 변경된 함수 (DB 커넥션 경합 방지)
    */
    async _executeParallelWithTimeout(functions, globalParams) {
        this.logger.debug(`순차 실행 시작: ${functions.length}개 함수 (타임아웃: ${this.functionTimeout}초)`);
        
        const results = {};
        let successCount = 0;
        let failCount = 0;
        let timeoutCount = 0;
        
        // 병렬 처리를 순차 처리로 변경
        for (let i = 0; i < functions.length; i++) {
            const func = functions[i];
            const funcName = func.name;
            const startTime = Date.now();
            
            try {
                const { name, params = {} } = func;
                const mergedParams = { ...this.defaultParams, ...globalParams, ...params };
                        
                this.logger.debug(`함수 실행 시작 (${i+1}/${functions.length}): ${funcName}`);
                
                // 첫 번째 함수가 아닌 경우 최소 간격 대기 (DB 압박 완화)
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                // 타임아웃과 함께 함수 실행
                const result = await this._executeFunctionWithTimeout(name, mergedParams);
                const apiConfig = this.apiConfigs[name];
                
                const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
                this.logger.info(`함수 실행 성공: ${funcName} (${executionTime}초)`);
                
                // 성공 결과 저장
                results[name] = {
                    desc: apiConfig.description,
                    success: true,
                    data: result,
                    execution_time: `${executionTime}초`
                };
                
                successCount++;
            } catch (error) {
                const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
                const isTimeout = error.message.includes('timeout');
                
                this.logger.warn(`함수 실행 실패 (스킵): ${funcName} - ${error.message} (${executionTime}초)`);
                
                // 실패 결과 저장
                results[funcName] = {
                    desc: this.apiConfigs[funcName]?.description || 'Unknown function',
                    success: false,
                    error: error.message,
                    timeout: isTimeout,
                    execution_time: `${executionTime}초`,
                    skipped: true,
                    executed_at: new Date().toISOString()
                };
                
                failCount++;
                if (isTimeout) {
                    timeoutCount++;
                }
                
                // 에러 발생해도 다음 함수 계속 실행 (기존 로직 유지)
                continue;
            }
        }
    
        this.logger.info(`순차 실행 완료 - 성공: ${successCount}개, 실패: ${failCount}개, 타임아웃: ${timeoutCount}개`);
        
        // 기존 로직과 동일하게 결과 처리
        if (successCount > 0) {
            return results;
        }
        else if (failCount > 0) {
            this.logger.warn(`모든 함수 실행이 실패했지만 결과 반환 계속 진행`);
            return results; // 실패한 결과라도 반환해서 다음 스텝으로 진행
        }
        
        return results;
    }

    /**
     * 타임아웃을 포함한 단일 함수 실행
     */
    async _executeFunctionWithTimeout(functionName, params) {
        return new Promise(async (resolve, reject) => {
            // 타임아웃 설정
            const timeoutId = setTimeout(() => {
                reject(new Error(`Function ${functionName} timeout after ${this.functionTimeout} seconds`));
            }, this.functionTimeout * 1000);

            try {
                const result = await this._executeSingleFunction(functionName, params);
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
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
            
            if (typeof handler !== 'function') {
                throw new Error(`Handler is not a function: ${handlerPath}`);
            }

            // 공유 커넥션 사용 (생성/해제 없음)
            const srv = new cds.ApplicationService();
            srv.db = this.sharedDb;

            return new Promise((resolve, reject) => {
                srv.on('*', async (req) => {
                    try {
                        req.data = params;
                        const tempSrv = {
                            on: (eventName, handlerFunc) => {
                                handlerFunc(req).then(resolve).catch(reject);
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

        const validFunctions = [];
        const invalidFunctions = [];

        inputs.functions.forEach((func, index) => {
            if (!func.name) {
                invalidFunctions.push(`name is required at index ${index}`);
                return;
            }

            if (!this.apiConfigs[func.name]) {
                invalidFunctions.push(`Function '${func.name}' not found in API configurations`);
                return;
            }
            
            validFunctions.push(func);
        });
        
        if (invalidFunctions.length > 0) {
            this.logger.warn(`유효하지 않은 함수들 (스킵): ${invalidFunctions.join(', ')}`);
        }

        if (validFunctions.length === 0) {
            throw new Error('No valid functions found');
        }
    }
}

module.exports = DataMultiFetchTool;