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
            let queryString = generateQuery;
            
            if (typeof queryString === 'string') {
                // JSON 파싱을 위한 안전한 전처리
                queryString = queryString
                    .replace(/`/g, '"')           // 백틱을 따옴표로 변경
                    .replace(/\n/g, '\\n')        // 줄바꿈 처리
                    .replace(/\r/g, '\\r')        // 캐리지 리턴 처리
                    .replace(/\t/g, '\\t')        // 탭 처리
                    .replace(/\\\\/g, '\\');      // 이중 백슬래시 처리
            }
            
            const parsed = JSON.parse(queryString);
            let sql_query = parsed.sql_query;
            
            if (sql_query) {
                // SQL 정리
                sql_query = sql_query
                    .replace(/\\n/g, ' ')
                    .replace(/\\r/g, ' ')
                    .replace(/\\t/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }
            
            return sql_query;
            
        } catch (parseError) {
            this.logger.error('JSON 파싱 실패:', parseError.message);
            
            // 대안: 정규식으로 SQL 부분만 추출
            try {
                const sqlMatch = generateQuery.match(/"sql_query":\s*"([^"]+)"/);
                if (sqlMatch) {
                    const sql_query = sqlMatch[1]
                        .replace(/\\n/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    this.logger.info('정규식으로 SQL 추출 성공');
                    return sql_query;
                }
                else {
                    throw new Error('SQL 쿼리를 찾을 수 없습니다');
                }
            } catch (regexError) {
                throw new Error(`쿼리 정보 파싱에 실패했습니다: ${parseError.message}`);
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

        // 다중 쿼리 방지
        if (cleanSql.includes(';')) {
            throw new Error('다중 SQL 문은 실행할 수 없습니다');
        }
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