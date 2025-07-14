const { parse } = require('@sap/cds');
const { createLogger } = require('../util/logger');

class DataTransformTool {
    constructor() {
        this.logger = createLogger('data-transform-tool');
    }

    /**
     * 데이터 변환 도구
     * @param {Object} inputs - 입력 파라미터
     * @param {Object|String} inputs.table_schema - 테이블 스키마 정보
     * @param {String} inputs.collected_data - 수집된 데이터 (JSON 문자열)
     * @param {String} inputs.drilldown_data - 상세 데이터 (JSON 문자열)
     * @param {String} inputs.selected_info - 클릭한 데이터 (JSON 문자열)
     * @returns {Promise<string>} 변환된 데이터
     */
    async execute(inputs) {
        try {
            const { table_schema, collected_data, drilldown_data, selected_info } = inputs;

            if (!table_schema) {
                throw new Error('table_schema is required');
            }

            // 스키마에서 매핑 정보 추출
            const { columnMapping, domainMapping } = this.extractMappings(table_schema);
            
            this.logger.debug("컬럼 매핑 수:", Object.keys(columnMapping).length);
            this.logger.debug("도메인 매핑 수:", Object.keys(domainMapping).length);
            
            const result = {};

            if (drilldown_data) {
                this.logger.info('drilldown_data 변환 시작');
                const parsedDrilldown = JSON.parse(drilldown_data);
                const processedDrilldown = this.processData(parsedDrilldown);
                result.drilldown_data = this.translateData(processedDrilldown, columnMapping, domainMapping);
                this.logger.info(`drilldown_data 변환 완료: ${result.drilldown_data.length}개 항목`);
            }

            if (selected_info) {
                this.logger.info('selected_info 변환 시작');
                const parsedSelected = JSON.parse(selected_info);
                const processedSelected = this.processData([parsedSelected]);
                result.selected_info = this.translateData(processedSelected, columnMapping, domainMapping);
                this.logger.info('selected_info 변환 완료');
            }
            
            if (collected_data) {
                this.logger.info('collected_data 변환 시작');
                result.collected_data = await this.processCollectedData(collected_data, columnMapping, domainMapping);
                this.logger.info('collected_data 변환 완료');
            }
            
            return JSON.stringify(result, null, 2);
        } catch (error) {
            this.logger.error('DataTransformTool 실행 실패:', error);
           
            // 에러 응답 구성
            const errorResponse = {
                success: false,
                error: error.message,
                processed_at: new Date().toISOString()
            };

            return JSON.stringify(errorResponse, null, 2)
        }
    }

    /**
     * collected_data 처리
     * @param {String} collected_data - 수집된 데이터 (JSON 문자열)
     * @param {Object} columnMapping - 컬럼 매핑
     * @param {Object} domainMapping - 도메인 매핑
     * @returns {Object} 처리된 데이터
     */
    async processCollectedData(collected_data, columnMapping, domainMapping) {
        try {
            const parsedData = JSON.parse(collected_data);
            const result = {};

            for (const [functionName, functionResult] of Object.entries(parsedData)) {
                this.logger.debug(`함수 ${functionName} 데이터 처리 중`);
                
                if (functionResult.data && Array.isArray(functionResult.data)) {
                    let processedData = functionResult.data;
                    
                    // 항상 숫자 처리
                    if (processedData.length > 0) {
                        processedData = this.processData(processedData);
                    }
                    
                    // 항상 컬럼명/도메인 값 번역
                    processedData = this.translateData(processedData, columnMapping, domainMapping);
                    
                    result[functionName] = {
                        ...functionResult,
                        data: processedData,
                        processed_at: new Date().toISOString(),
                        original_count: functionResult.data.length,
                        processed_count: processedData.length
                    };
                }
                else {
                    // 에러가 있거나 데이터가 없는 경우 그대로 전달
                    result[functionName] = functionResult;
                }
            }

            return result;
        } catch (error) {
            this.logger.error('collected_data 처리 실패:', error);
            throw new Error(`collected_data 처리 중 오류: ${error.message}`);
        }
    }

    /**
     * 테이블 스키마에서 매핑 정보 추출
     * @param {Object|String} table_schema - 테이블 스키마 정보
     * @returns {Object} {columnMapping, domainMapping} 객체
     */
    extractMappings(table_schema) {
        this.logger.info('매핑 추출 시작');
        
        const columnMapping = {};
        const domainMapping = {};
        
        try {
            // table_schema가 문자열인 경우 파싱
            const schema = typeof table_schema === 'string' 
                ? JSON.parse(table_schema) 
                : table_schema;
            
            // 스키마 구조 자동 감지 및 처리
            let tableEntries = [];
            
            if (schema.schema) {
                // 병합된 스키마: { schema: { table1: {...}, table2: {...} } }
                tableEntries = Object.entries(schema.schema);
            }
            else if (schema.schemas) {
                // 개별 스키마: { schemas: { table1: {...}, table2: {...} } }
                const allTables = {};
                Object.values(schema.schemas).forEach(tableSchema => {
                    Object.assign(allTables, tableSchema);
                });
                tableEntries = Object.entries(allTables);
            }
            else {
                // 직접 테이블: { table1: {...}, table2: {...} }
                tableEntries = Object.entries(schema);
            }
            
            this.logger.info('스키마 내 테이블 수:', tableEntries.length);
            
            tableEntries.forEach(([tableName, tableInfo]) => {
                if (tableInfo && tableInfo.cols) {
                    this.logger.debug(`${tableName} 컬럼 수:`, Object.keys(tableInfo.cols).length);
                    
                    Object.entries(tableInfo.cols).forEach(([colName, colInfo]) => {
                        // 컬럼명 매핑
                        if (colInfo.name) {
                            columnMapping[colName] = colInfo.name;
                        }
                        else if (colInfo.desc) {
                            columnMapping[colName] = colInfo.desc;
                        }
                        
                        // 도메인 매핑
                        if (colInfo.domain) {
                            try {
                                let domainData;
                                if (typeof colInfo.domain === 'string') {
                                    domainData = JSON.parse(colInfo.domain);
                                }
                                else {
                                    domainData = colInfo.domain;
                                }
                                
                                domainMapping[colName] = domainData;
                                if (columnMapping[colName]) {
                                    domainMapping[columnMapping[colName]] = domainData;
                                }
                            } catch (e) {
                                this.logger.warn(`도메인 파싱 실패 [${colName}]:`, e);
                            }
                        }
                    });
                }
            });
    
            this.logger.info(`컬럼 매핑 추출 완료: ${Object.keys(columnMapping).length}개`);
            this.logger.info(`도메인 매핑 추출 완료: ${Object.keys(domainMapping).length}개`);
    
            return { columnMapping, domainMapping };
        } catch (error) {
            this.logger.error('스키마 파싱 실패:', error);
            return { columnMapping: {}, domainMapping: {} };
        }
    }

    /**
     * 데이터 객체의 영문 키를 한글명으로 변환하고 도메인 값 변환
     */
    translateData(data, columnMapping, domainMapping) {
        if (Array.isArray(data)) {
            return data.map(item => this.translateObject(item, columnMapping, domainMapping));
        }
        else if (typeof data === 'object' && data !== null) {
            return this.translateObject(data, columnMapping, domainMapping);
        }
        
        return data;
    }

    /**
     * 객체의 키를 한글명으로 변환하고 도메인 값 변환
     */
    translateObject(obj, columnMapping, domainMapping) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        
        const translatedObj = {};

        Object.entries(obj).forEach(([key, value]) => {
            // 한글명으로 변환
            const translatedKey = columnMapping[key] || key;
            
            // 도메인 값 변환
            let translatedValue = value;
            if (domainMapping[key] && typeof value === 'string') {
                const domainMap = domainMapping[key];
                if (domainMap[value]) {
                    translatedValue = domainMap[value];
                }
            }
            
            translatedObj[translatedKey] = translatedValue;
        });
        
        return translatedObj;
    }

    /**
     * 숫자 정상 변환 (target 자릿수 보완, round(0), round(4))
     * @param {Object|Array} data - 변환할 데이터
     * @returns {Object|Array} 정상 변환된 데이터
     */
    processData(data) { 

        const specialTypes = ['마진율', '마진률', 'BR(MM)', 'BR(Cost)'];
        
        const isactual = Object.prototype.hasOwnProperty.call(data[0], 'actual_curr_ym_value');
        const isactual_2 = Object.prototype.hasOwnProperty.call(data[0], 'curr_value');

        if (isactual || isactual_2) {
            console.log("실적PL의 정보를 변환합니다.");
            const columns = Object.keys(data[0]);

            data.forEach(item => {
                const hasType = Object.prototype.hasOwnProperty.call(item, 'type');
                const typeVal = item.type;
            
                // 조건 A: type 컬럼이 있고, 값이 specialTypes 중 하나인 경우 = type이 마진율, BR
                if (hasType && specialTypes.includes(typeVal)) {
                    columns.forEach(col => {
                        if (col in item && typeof item[col] === 'number') {
                            item[col] = Number(item[col].toFixed(4));
                        }
                    });
                }
                // 조건 B: type 컬럼이 없고, 컬럼 중 'rate'가 포함된 것이 있는 경우 + target 작음 = RoHC (DT 빼기 위한 목적)
                else if (!hasType && Object.keys(item).some(k => k.includes('rate')) && item["target_curr_y_value"] < 100 && item["target_curr_y_value"] > 0) {
                    columns.forEach(col => {
                        if (col in item && typeof item[col] === 'number') {
                            item[col] = Number(item[col].toFixed(4));
                        }
                    });
                }
                // 조건 C: 그 외의 경우
                else {
                    columns.forEach(col => {
                        if (col in item && typeof item[col] === 'number') {
                            if (col.includes('target')) {
                                item[col] = item[col] * 1e8;
                            }
                            else if (col.includes('rate')) {
                                item[col] = Number(item[col].toFixed(4));
                            }
                            else {
                                item[col] = Math.round(item[col]);
                            }
                        }
                    });
                }
            });
        }
        else {
            console.log("추정PL의 정보를 변환합니다.");
            const columns = Object.keys(data[0]);
            data.forEach(item => {
                const hasType = Object.prototype.hasOwnProperty.call(item, 'type');
                const typeVal = item.type;

                // 조건 A: type 컬럼이 있고, 값이 specialTypes 중 하나인 경우 = type이 BR
                if (hasType && specialTypes.includes(typeVal)) {
                    columns.forEach(col => {
                        if (col in item && typeof item[col] === 'number') {
                            item[col] = Number(item[col].toFixed(4));
                        }
                    });
                }
                // 조건 B: type 컬럼이 있고, 값이 '건수'인 경우
                else if (hasType && typeVal == '건수') {
                    columns.forEach(col => {
                        if (col in item && typeof item[col] === 'number') {
                            item[col] = Math.round(item[col]);
                        }
                    });
                }
                // 조건 C: 그 외의 경우
                else {
                    columns.forEach(col => {
                        if (col in item && typeof item[col] === 'number') {
                            if (col.includes('target')) {
                                item[col] = item[col] * 1e8;
                            }
                            else if (col.includes('ratio')) {
                                item[col] = Number(item[col].toFixed(4));
                            }
                            else {
                                item[col] = Math.round(item[col]);
                            }
                        }
                    });
                }
            });
            
        }

        return data;
      }

    /**
     * 테이블 스키마에서 컬럼 매핑과 도메인 매핑 정보 추출
     * @param {Object} table_schema - 테이블 스키마 정보
     * @returns {Object} {columnMapping, domainMapping} 객체
     */
    extractMappings(table_schema) {
        this.logger.info('매핑 추출 시작');
        
        const columnMapping = {};
        const domainMapping = {};
        
        try {
            // table_schema가 문자열인 경우 파싱
            const schema = typeof table_schema === 'string' 
                ? JSON.parse(table_schema) 
                : table_schema;
            
            // 테이블 정보에 접근
            if (schema) {
                this.logger.info('스키마 내 테이블 수:', Object.keys(schema).length);
                
                Object.entries(schema).forEach(([tableName, tableInfo]) => {
                    if (tableInfo.cols) {
                        this.logger.debug(`${tableName} 컬럼 수:`, Object.keys(tableInfo.cols).length);
                        
                        Object.entries(tableInfo.cols).forEach(([colName, colInfo]) => {
                            // 컬럼명 매핑: name이 있으면 name을 사용, 없으면 desc 사용
                            if (colInfo.name) {
                                columnMapping[colName] = colInfo.name;
                            }
                            else if (colInfo.desc) {
                                columnMapping[colName] = colInfo.desc;
                            }
                            
                            // 도메인 매핑 추출
                            if (colInfo.domain) {
                                try {
                                    let domainData;
                                    if (typeof colInfo.domain === 'string') {
                                        domainData = JSON.parse(colInfo.domain);
                                    }
                                    else {
                                        domainData = colInfo.domain;
                                    }
                                    
                                    // 원본 컬럼명과 변환된 컬럼명 모두에 대해 도메인 매핑 설정
                                    domainMapping[colName] = domainData;
                                    if (columnMapping[colName]) {
                                        domainMapping[columnMapping[colName]] = domainData;
                                    }
                                    
                                    this.logger.debug(`도메인 매핑 추가: ${colName} ->`, domainData);
                                } catch (e) {
                                    this.logger.warn(`도메인 파싱 실패 [${colName}]:`, e);
                                }
                            }
                        });
                    }
                    else {
                        this.logger.warn(`테이블 ${tableName}에 cols가 없습니다`);
                    }
                });
            }
            else {
                this.logger.warn('스키마가 비어있습니다');
            }
            this.logger.info(`컬럼 매핑 추출 완료: ${Object.keys(columnMapping).length}개 컬럼`);
            this.logger.info(`도메인 매핑 추출 완료: ${Object.keys(domainMapping).length}개 컬럼`);
    
            return { columnMapping, domainMapping };
        } catch (error) {
            this.logger.error('스키마 파싱 실패:', error);
            return { columnMapping: {}, domainMapping: {} };
        }
    }

    /**
     * 데이터 객체의 영문 키를 한글명으로 변환하고 도메인 값 변환
     * @param {Object|Array} data - 변환할 데이터
     * @param {Object} columnMapping - 영문-한글 매핑 정보
     * @param {Object} domainMapping - 도메인 매핑 정보
     * @returns {Object|Array} 한글명으로 변환된 데이터
     */
    translateData(data, columnMapping, domainMapping) {
        if (Array.isArray(data)) {
            return data.map((item, index) => {
                this.logger.debug(`배열 항목 ${index} 변환 중`);
                return this.translateObject(item, columnMapping, domainMapping);
            });
        }
        else if (typeof data === 'object' && data !== null) {
            return this.translateObject(data, columnMapping, domainMapping);
        }
        
        return data;
    }

    /**
     * 객체의 키를 한글명으로 변환하고 도메인 값 변환
     * @param {Object} obj - 변환할 객체
     * @param {Object} columnMapping - 영문-한글 매핑 정보
     * @param {Object} domainMapping - 도메인 매핑 정보
     * @returns {Object} 한글명으로 변환된 객체
     */
    translateObject(obj, columnMapping, domainMapping) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        
        const translatedObj = {};

        Object.entries(obj).forEach(([key, value]) => {
            // 한글명이 있으면 한글명으로, 없으면 원래 키 사용
            const translatedKey = columnMapping[key] || key;
            
            // 값 변환 처리
            let translatedValue = value;

            // 도메인 매핑이 있는 경우 값 변환
            if (domainMapping[key] && typeof value === 'string') {
                const domainMap = domainMapping[key];
                if (domainMap[value]) {
                    translatedValue = domainMap[value];
                    this.logger.debug(`도메인 값 변환: ${key}[${value}] -> ${translatedKey}[${translatedValue}]`);
                }
            }
            
            translatedObj[translatedKey] = translatedValue;
        });
        
        return translatedObj;
    }

    /**
     * 변환 결과 통계 정보 반환
     * @param {Object} originalData - 원본 데이터
     * @param {Object} translatedData - 변환된 데이터
     * @returns {Object} 변환 통계
     */
    getTranslationStats(originalData, translatedData) {
        const originalKeys = this.extractAllKeys(originalData);
        const translatedKeys = this.extractAllKeys(translatedData);

        return {
            originalKeyCount: originalKeys.length,
            translatedKeyCount: translatedKeys.length,
            translationRate: translatedKeys.length / originalKeys.length * 100
        };
    }

    /**
     * 객체에서 모든 키 추출 (재귀적)
     * @param {Object|Array} data - 데이터
     * @returns {Array} 모든 키 배열
     */
    extractAllKeys(data) {
        const keys = [];

        const traverse = (obj) => {
            if (Array.isArray(obj)) {
                obj.forEach(item => traverse(item));
            }
            else if (typeof obj === 'object' && obj !== null) {
                Object.keys(obj).forEach(key => {
                    keys.push(key);
                    traverse(obj[key]);
                });
            }
        };

        traverse(data);
        return [...new Set(keys)]; // 중복 제거
    }
}

module.exports = DataTransformTool;