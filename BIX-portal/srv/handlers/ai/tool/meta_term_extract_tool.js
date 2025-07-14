const cds = require('@sap/cds');
const { createLogger } = require('../util/logger');

class MetaTermExtractTool {
    constructor() {
        this.logger = createLogger('meta-term-extract-tool');
    }

    /**
     * 키워드로 용어 검색
     * @param {Object} inputs
     * @param {Object|string} inputs.relevant_terms - 관련 용어 정보 (JSON 문자열 또는 객체)
     */
    async execute(inputs) {
        try {
            let { relevant_terms } = inputs;
            
            if (!relevant_terms) {
                throw new Error('relevant_terms is required');
            }
            
            // JSON 문자열인 경우 파싱
            if (typeof relevant_terms === 'string') {
                try {
                    relevant_terms = JSON.parse(relevant_terms);
                } catch (parseError) {
                    this.logger.error('JSON 파싱 실패:', parseError);
                    throw new Error('Invalid JSON format in relevant_terms');
                }
            }
            
            const { keywords, business_domain } = relevant_terms;
            
            if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
                this.logger.info('키워드가 없어 빈 결과 반환');
                return JSON.stringify([], null, 2);  // 빈 배열 반환
            }
            
            this.logger.info(`용어 검색: ${keywords.join(', ')}, 업무영역: ${business_domain}`);
            
            const db = await cds.connect.to('db');
            
            // 키워드 검색 조건 생성 (한글명, 영문명, 설명에서 검색)
            const keywordConditions = keywords.map(() => 
                '(NAME LIKE ? OR ENG_NAME LIKE ? OR DESCRIPTION LIKE ?)'
            ).join(' OR ');
            
            let query = `
                SELECT SYSTEM_NAME
                     , BUSINESS_DOMAIN
                     , TYPE
                     , NAME
                     , ENG_NAME
                     , OFFICIAL_ENG_NAME
                     , COALESCE(NULLIF(USER_DESCRIPTION, ''), DESCRIPTION) AS DESCRIPTION
                     , USER_DESCRIPTION
                     , CALCULATION_METHOD
                  FROM METASTORE_TERM 
                 WHERE (${keywordConditions})
            `;
            
            const params = [];
            keywords.forEach(keyword => {
                const searchTerm = `%${keyword}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            });
            
            // 업무 영역 필터 추가
            /*
            if (business_domain) {
                query += ' AND BUSINESS_DOMAIN = ?';
                params.push(business_domain);
            }
            */
            
            query += ' ORDER BY NAME LIMIT 10';
            
            const terms = await db.run(query, params);
            
            const result = terms.map(term => this.buildTermInfo(term));
            
            this.logger.info(`용어 검색 완료: ${result.length}개`);
            return JSON.stringify(result, null, 2);
        } catch (error) {
            this.logger.error('MetaTermExtractTool 실행 실패:', error);
        
            // 에러 응답 구성
            const errorResponse = {
                success: false,
                error: error.message,
                processed_at: new Date().toISOString(),
                search_terms: inputs?.relevant_terms || null
            };
            
            return JSON.stringify(errorResponse, null, 2);
        }
    }

    /**
     * 용어 정보 구성 (null 값 제외)
     * @param {Object} termData - 용어 데이터
     * @returns {Object} 용어 정보
     */
    buildTermInfo(termData) {
        const info = {};
        
        if (termData.SYSTEM_NAME) info.system_name = termData.SYSTEM_NAME;
        if (termData.BUSINESS_DOMAIN) info.business_domain = termData.BUSINESS_DOMAIN;
        if (termData.TYPE) info.type = termData.TYPE;
        if (termData.NAME) info.name = termData.NAME;
        if (termData.ENG_NAME) info.eng_name = termData.ENG_NAME;
        if (termData.OFFICIAL_ENG_NAME) info.official_eng_name = termData.OFFICIAL_ENG_NAME;
        if (termData.DESCRIPTION) info.description = termData.DESCRIPTION;
        if (termData.USER_DESCRIPTION) info.user_description = termData.USER_DESCRIPTION;
        if (termData.CALCULATION_METHOD) info.calculation_method = termData.CALCULATION_METHOD;
        
        return info;
    }
}

module.exports = MetaTermExtractTool;