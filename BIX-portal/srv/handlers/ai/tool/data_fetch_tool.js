const cds = require('@sap/cds');
const settings = require('../config/settings');
const { createLogger } = require('../util/logger');

/**
 * 데이터 조회 도구
 */
class DataFetcherTool {
    constructor() {
        this.logger = createLogger('data-fetcher-tool');
        // API 설정 정보 로드
        this.apiConfigs = settings.dataFetcher.apis;
        // 기본 파라미터 설정 (year, month, org_id)
        this.defaultParams = settings.dataFetcher.defaultParams;
    }

    /**
     * AI Tool 메인 실행 인터페이스
     * @param {Object} inputs - 입력 파라미터
     * @param {string} inputs.function_name - 실행할 함수명 (예: 'get_actual_sale_org_pl')
     * @param {Object} [inputs.function_params] - 함수 실행 파라미터
     * @param {Object} [inputs.params] - 함수 실행 파라미터 (대체 키명)
     * @param {string} [inputs.function_params.year] - 조회 년도
     * @param {string} [inputs.function_params.month] - 조회 월
     * @param {string} [inputs.function_params.org_id] - 조직 ID
     * @returns {Promise<string>} JSON 형태의 실행 결과
     */
    async execute(inputs) {
        try {
            // 입력 파라미터에서 함수명과 파라미터 추출
            const { function_name } = inputs;
            const params = inputs.function_params || inputs.params || {};

            this.logger.info(`DataFetcherTool 실행: ${function_name}`);
            this.logger.debug('입력 파라미터:', inputs);

            // 함수명 필수 체크
            if (!function_name) {
                throw new Error('function_name is required');
            }

            // API 설정 존재 여부 확인
            const apiConfig = this.apiConfigs[function_name];
            if (!apiConfig) {
                throw new Error(`Function '${function_name}' not found`);
            }

            // 기본값과 입력 파라미터 병합
            const mergedParams = { ...this.defaultParams, ...params };
            this.logger.debug('최종 파라미터:', mergedParams);

            // 필수 파라미터 유효성 검증
            this.validateRequiredParams(apiConfig.params, mergedParams);
            
            // CDS 서비스 컨텍스트에서 핸들러 실행
            const result = await this.executeHandlerWithCDS(apiConfig.handlerPath, mergedParams);  
            
            console.log("result !!! ", result);
            
            let filteredResult = [];
            let timeinfo = [{"마감년월": String(inputs.function_params.year) + "년 " + String(inputs.function_params.month) + "월"}];
            if (typeof result !== "undefined") {

                // 조직 및 account 관련 후처리 & 선택한 구분(Type)에 대한 필터링
                const filterType = inputs.filter_type;
                console.log("filterType !!! ", filterType);
                // const filteryn = (typeof filterType === 'number');
                const filteryn = (filterType.length == 4)
                let timeinfo = [{"마감년월": String(inputs.function_params.year) + "년 " + String(inputs.function_params.month) + "월"}];
                const hasType = Object.prototype.hasOwnProperty.call(result[0], 'type');

                if (!filteryn && !filterType.includes("-") && !filterType.includes("_") && hasType) { //includes 조건: 대내/대외 및 account 처리 위함
                    const arr = Object.values(result);
                    const filteredArr = arr.filter(item => item.type === filterType);
                    filteredResult = filteredArr.concat(timeinfo);
                }
                else {
                    const arr = Object.values(result);
                    filteredResult = arr.concat(timeinfo);
                }
            }
            else {
                filteredResult = timeinfo; // 에러 방지용
                this.logger.info(`== result is undefined ==`);
            }

            this.logger.info(`데이터 조회 완료: ${function_name}`);
            return JSON.stringify(filteredResult, null, 2);
        } catch (error) {
            this.logger.error('DataFetcherTool 실행 실패:', error);
           
            // 에러 응답 구성
            const errorResponse = {
                success: false,
                function_name: inputs.function_name || 'unknown',
                error: error.message,
                executed_at: new Date().toISOString()
            };

            return JSON.stringify(errorResponse, null, 2);
        }
    }

    /**
     * 필수 파라미터 유효성 검증
     * @param {Array<string>} requiredParams - 필수 파라미터 목록
     * @param {Object} providedParams - 제공된 파라미터 객체
     * @throws {Error} 필수 파라미터가 누락된 경우 에러 발생
     */
    validateRequiredParams(requiredParams, providedParams) {
        const missingParams = [];
        
        // 각 필수 파라미터의 존재 여부 확인
        for (const param of requiredParams) {
            // 값이 없거나 빈 문자열인 경우 (단, 0은 유효한 값으로 처리)
            if (!providedParams[param] && providedParams[param] !== 0) {
                missingParams.push(param);
            }
        }

        // 누락된 파라미터가 있으면 에러 발생
        if (missingParams.length > 0) {
            throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
        }
    }

    /**
     * CDS 서비스 컨텍스트에서 핸들러 실행
     * @param {string} handlerPath - 핸들러 파일 경로 (상대 경로)
     * @param {Object} params - 핸들러에 전달할 파라미터
     * @param {string} params.year - 조회 년도
     * @param {string} params.month - 조회 월
     * @param {string} params.org_id - 조직 ID
     * @returns {Promise<any>} 핸들러 실행 결과
     */
    async executeHandlerWithCDS(handlerPath, params) {
        try {
            // 동적으로 핸들러 모듈 로딩
            const handler = require(handlerPath);
            this.logger.debug(`핸들러 로딩 완료: ${handlerPath}`);

            // 핸들러가 함수인지 확인
            if (typeof handler !== 'function') {
                throw new Error(`Handler is not a function: ${handlerPath}`);
            }

            // 실제 CDS ApplicationService 인스턴스 생성
            const srv = new cds.ApplicationService();
            
            // 데이터베이스 연결 확보
            srv.db = await cds.connect.to('db');

            return new Promise((resolve, reject) => {
                // CDS 이벤트 핸들러 등록 (모든 이벤트 캐치)
                srv.on('*', async (req) => {
                    try {
                        // 요청 객체에 파라미터 데이터 설정
                        req.data = params;
                        
                        // 핸들러 실행을 위한 임시 서비스 객체 생성
                        // 실제 CDS 서비스의 주요 기능들을 포함
                        const tempSrv = {
                            on: (eventName, handlerFunc) => {
                                // 핸들러 함수 실행 후 결과 반환
                                handlerFunc(req)
                                    .then(resolve)
                                    .catch(reject);
                            }
                        };

                        // 실제 API 핸들러 함수 호출
                        handler(tempSrv);
                    } catch (error) {
                        reject(error);
                    }
                });

                // 커스텀 이벤트 발생하여 핸들러 실행 트리거
                srv.emit('custom_event', { data: params });
            });

        } catch (requireError) {
            // 핸들러 로딩 실패 시 에러 처리
            this.logger.error(`핸들러 로딩 실패: ${handlerPath}`, requireError);
            throw new Error(`Failed to load handler: ${handlerPath} - ${requireError.message}`);
        }
    }
}

module.exports = DataFetcherTool;