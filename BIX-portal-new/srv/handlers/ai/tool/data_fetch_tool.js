const DataFetcher = require('./data_fetcher');
const dataProcessor = require('../util/data_processor');
const { createLogger } = require('../util/logger');

/**
 * 통합 데이터 도구 클래스 - 조회 및 필터링 기능 통합
 */
class DataFetchTool {
    constructor() {
        this.logger = createLogger('data-fetch-tool');
        this.dataFetcher = new DataFetcher();
    }

    /**
     * 도구 실행
     * @param {Object} inputs - 입력 파라미터
     * @param {string} inputs.function_name - 호출할 함수명
     * @param {Object} inputs.function_params - 함수별 파라미터들
     * @param {string} inputs.filter_type - 필터링할 타입
     * @returns {Promise<Object>} 실행 결과
     */
    async execute(inputs) {
        try {
            this.logger.info('통합 데이터 도구 실행 시작', {inputs});
            const { function_name, function_params, filter_type } = inputs;

            // 필수 파라미터 체크
            if (!function_name) {
                this.logger.warn('함수명이 제공되지 않았습니다. 빈 데이터를 반환하고 다음 단계로 진행합니다.');
                return JSON.stringify([], null, 2);
            }    

            // function_params가 객체가 아니거나 비어있을 때 처리
            if (!function_params || typeof function_params !== 'object') {
                throw new Error('Missing or invalid function_params');
            }

            // 1단계: 데이터 조회
            this.logger.info(`데이터 조회 시작: ${function_name}`);
            const fetchResult = await this.dataFetcher.executeFunction(function_name, function_params);

            // 함수별 필수 파라미터 체크
            const requiredParams = this.getFunctionParams(function_name);
            for (const param of requiredParams) {
                if (!function_params[param]) {
                    this.logger.warn(`Missing parameter for ${function_name}: ${param}`);
                }
            }

            if (!fetchResult.success) {
                throw new Error(`Data fetch failed: ${fetchResult.error}`);
            }

            this.logger.info(`데이터 조회 완료: ${fetchResult.data.length}개 항목`);

            let finalData = fetchResult.data;

            // 2단계: 필터링
            if (filter_type) {
                finalData = dataProcessor.filterByType(fetchResult.data, filter_type);
                this.logger.info(`타입 필터링 완료: ${finalData.length}개 항목`);
            }

            finalData = JSON.stringify(finalData, null, 2)
            return finalData;

        } catch (error) {
            this.logger.error('통합 데이터 도구 실행 실패:', error);
            throw error;
        }
    }

    /**
     * 사용 가능한 함수 목록 조회
     * @returns {Array} 사용 가능한 함수들의 정보
     */
    getAvailableFunctions() {
        return this.dataFetcher.getAvailableFunctions();
    }

    /**
     * 특정 함수의 필수 파라미터 조회
     * @param {string} functionName - 함수명
     * @returns {Array} 필수 파라미터 목록
     */
    getFunctionParams(functionName) {
        const functions = this.dataFetcher.getAvailableFunctions();
        const targetFunction = functions.find(f => f.name === functionName);
        return targetFunction ? targetFunction.required_params : [];
    }
}

module.exports = DataFetchTool;