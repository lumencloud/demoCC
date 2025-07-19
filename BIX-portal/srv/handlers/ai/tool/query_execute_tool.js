const cds = require('@sap/cds');
const { createLogger } = require('../util/logger');

/**
 * 데이터베이스 쿼리 실행 도구 클래스
 */
class QueryExecuteTool {
    constructor() {
        this.logger = createLogger('query-execute-tool');
    }

    /**
     * 도구 실행 - SQL 쿼리 실행
     * @param {Object} inputs - 입력 파라미터
     * @param {string} inputs.sql_query - 실행할 SQL 쿼리
     * @param {string} inputs.generate_query - JSON 형태의 쿼리 정보
     * @returns {Promise<string>} 쿼리 실행 결과 JSON
     */
    async execute(inputs) {
        try {
            let sql_query;
            const limit = 100;

            // inputs 구조 확인 및 파싱
            if (inputs.sql_query) {
                sql_query = inputs.sql_query;
            }
            else if (inputs.generate_query) {
                sql_query = this.parseGenerateQuery(inputs.generate_query);
            }
            else {
                throw new Error('SQL 쿼리가 필요합니다');
            }

            // 필수 파라미터 체크
            if (!sql_query || typeof sql_query !== 'string') {
                throw new Error('SQL 쿼리는 문자열 형태여야 합니다');
            }

            // SQL 유효성 검사
            this.validateSqlQuery(sql_query);

            // SQL에 LIMIT 적용 (필요한 경우)
            const processedSql = this.applySqlLimit(sql_query, limit);

            // 쿼리 실행
            this.logger.info('쿼리 실행 중');
            const db = await cds.connect.to('db');
            const result = await db.run(processedSql);

            this.logger.info(`쿼리 실행 완료: ${result.length}개 행 반환`);
            
            return JSON.stringify(result, null, 2);
        } catch (error) {
            this.logger.error('QueryExecuteTool 실행 실패:', error);
            
            // 에러 응답 구성
            const errorResponse = {
                success: false,
                error: error.message,
                processed_at: new Date().toISOString(),
                query: inputs?.sql_query || inputs?.generate_query || null
            };
            
            return JSON.stringify(errorResponse, null, 2);
        }
    }

    /**
     * generate_query JSON 파싱
     * @param {string} generateQuery - JSON 형태의 쿼리 정보
     * @returns {string} 추출된 SQL 쿼리
     */
    parseGenerateQuery(generateQuery) {
        try {
            this.logger.debug('원본 generate_query:', generateQuery);
            
            // 1단계: 기본 JSON 파싱 시도
            let queryData;
            if (typeof generateQuery === 'string') {
                queryData = JSON.parse(generateQuery);
            }
            else {
                queryData = generateQuery;
            }
            
            let sql_query = queryData.sql_query;
            
            if (sql_query) {
                // SQL 정리
                sql_query = sql_query
                    .replace(/\\n/g, ' ')
                    .replace(/\\r/g, ' ')
                    .replace(/\\t/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                this.logger.info('JSON 파싱 성공');
                return sql_query;
            }
            else {
                throw new Error('sql_query 필드가 없습니다');
            }
        } catch (parseError) {
            this.logger.error('JSON 파싱 실패:', parseError.message);
            
            // 2단계: 정규식으로 SQL 추출 (더 강력한 패턴)
            try {
                const generateQueryStr = typeof generateQuery === 'string' ? 
                    generateQuery : JSON.stringify(generateQuery);
                
                // 여러 정규식 패턴 시도
                const patterns = [
                    /"sql_query":\s*"((?:[^"\\]|\\.)*)"/g,  // 이스케이프 문자 포함
                    /'sql_query':\s*'((?:[^'\\]|\\.)*)'/g,  // 단일 따옴표
                    /`sql_query`:\s*`((?:[^`\\]|\\.)*)`/g,  // 백틱
                    /"sql_query":\s*"([^"]*)"/g             // 기본 패턴
                ];
                
                for (const pattern of patterns) {
                    const match = pattern.exec(generateQueryStr);
                    if (match && match[1]) {
                        let sql_query = match[1]
                            .replace(/\\"/g, '"')     // 이스케이프된 따옴표 복원
                            .replace(/\\n/g, ' ')     // 줄바꿈 처리
                            .replace(/\\r/g, ' ')     // 캐리지 리턴 처리  
                            .replace(/\\t/g, ' ')     // 탭 처리
                            .replace(/\\\\/g, '\\')   // 이중 백슬래시 처리
                            .replace(/\s+/g, ' ')     // 연속 공백 정리
                            .trim();
                        
                        this.logger.info('정규식으로 SQL 추출 성공');
                        return sql_query;
                    }
                }
                
                throw new Error('SQL 쿼리를 찾을 수 없습니다');
            } catch (regexError) {
                this.logger.error('정규식 추출 실패:', regexError.message);
                
                // 3단계: 마지막 시도 - 문자열 검색
                try {
                    const generateQueryStr = typeof generateQuery === 'string' ? 
                        generateQuery : JSON.stringify(generateQuery);
                    
                    const startMarker = '"sql_query"';
                    const startIndex = generateQueryStr.indexOf(startMarker);
                    
                    if (startIndex !== -1) {
                        const colonIndex = generateQueryStr.indexOf(':', startIndex);
                        const quoteStartIndex = generateQueryStr.indexOf('"', colonIndex) + 1;
                        
                        // 마지막 따옴표 찾기 (이스케이프된 것 제외)
                        let quoteEndIndex = quoteStartIndex;
                        let escaped = false;
                        
                        for (let i = quoteStartIndex; i < generateQueryStr.length; i++) {
                            const char = generateQueryStr[i];
                            if (escaped) {
                                escaped = false;
                                continue;
                            }
                            if (char === '\\') {
                                escaped = true;
                                continue;
                            }
                            if (char === '"') {
                                quoteEndIndex = i;
                                break;
                            }
                        }
                        
                        if (quoteEndIndex > quoteStartIndex) {
                            const sql_query = generateQueryStr
                                .substring(quoteStartIndex, quoteEndIndex)
                                .replace(/\\"/g, '"')
                                .replace(/\\n/g, ' ')
                                .replace(/\\r/g, ' ')
                                .replace(/\\t/g, ' ')
                                .replace(/\\\\/g, '\\')
                                .replace(/\s+/g, ' ')
                                .trim();
                            
                            this.logger.info('문자열 검색으로 SQL 추출 성공');
                            return sql_query;
                        }
                    }
                    
                    throw new Error('문자열 검색에서도 SQL을 찾을 수 없습니다');  
                } catch (stringError) {
                    throw new Error(`모든 파싱 방법 실패: JSON(${parseError.message}), Regex(${regexError.message}), String(${stringError.message})`);
                }
            }
        }
    }

    /**
     * SQL 쿼리 유효성 검사
     * @param {string} sql - SQL 쿼리
     */
    validateSqlQuery(sql) {
        const cleanSql = sql.trim().toUpperCase();
        
        // SELECT 쿼리만 허용
        if (!cleanSql.startsWith('SELECT')) {
            throw new Error('SELECT 쿼리만 실행할 수 있습니다');
        }

        // 위험한 키워드 체크
        const dangerousKeywords = [
            'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 
            'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC',
            'EXECUTE', 'MERGE', 'CALL'
        ];
        
        for (const keyword of dangerousKeywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(cleanSql)) {
                throw new Error(`허용되지 않는 SQL 키워드가 포함되어 있습니다: ${keyword}`);
            }
        }

        // 기본적인 SQL 구문 체크
        if (!cleanSql.includes('FROM')) {
            throw new Error('올바르지 않은 SQL 구문입니다. FROM 절이 필요합니다');
        }

        // // 다중 쿼리 방지
        // if (cleanSql.includes(';')) {
        //     throw new Error('다중 SQL 문은 실행할 수 없습니다');
        // }
    }

    /**
     * SQL에 LIMIT 적용
     * @param {string} sql - 원본 SQL
     * @param {number} limit - 제한값
     * @returns {string} LIMIT이 적용된 SQL
     */
    applySqlLimit(sql, limit) {
        const cleanSql = sql.trim();
        const upperSql = cleanSql.toUpperCase();
        
        // 이미 LIMIT이 있는지 체크
        if (upperSql.includes('LIMIT') || upperSql.includes('TOP')) {
            this.logger.info('SQL already contains LIMIT/TOP clause');
            return cleanSql;
        }
        
        // 세미콜론 제거 (있는 경우)
        const sqlWithoutSemicolon = cleanSql.replace(/;+$/, '');
        
        // LIMIT 추가
        return `${sqlWithoutSemicolon} LIMIT ${limit}`;
    }
}

module.exports = QueryExecuteTool;