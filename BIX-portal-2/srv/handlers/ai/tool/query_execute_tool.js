const cds = require('@sap/cds');
const { createLogger } = require('../util/logger');

/**
 * 데이터베이스 쿼리 실행 도구 클래스
 */
class QueryExecuteTool {
    constructor() {
        this.logger = createLogger('db-query-execute-tool');
    }

    /**
     * 도구 실행 - SQL 쿼리 실행
     * @param {Object} inputs - 입력 파라미터
     * @param {string} inputs.sql_query - 실행할 SQL 쿼리 (필수)
     * @param {number} inputs.limit - 결과 제한 (기본값: 100, 최대: 1000)
     * @returns {Promise<string>} 쿼리 실행 결과 JSON
     */
    async execute(inputs) {
        try {
            let sql_query;
            const limit = 100;

            // inputs 구조 확인 및 파싱
            if (inputs.sql_query) {
                // 직접 sql_query가 있는 경우
                sql_query = inputs.sql_query;
            }
            else if (inputs.generate_query) {
                // generate_query JSON 문자열에서 파싱
                try {
                    const parsed = JSON.parse(inputs.generate_query);
                    sql_query = parsed.sql_query;
                } catch (parseError) {
                    throw new Error(`Failed to parse generate_query: ${parseError.message}`);
                }
            }
            else {
                throw new Error('sql_query is required either directly or in generate_query');
            }

            // 필수 파라미터 체크
            if (!sql_query || typeof sql_query !== 'string') {
                throw new Error('sql_query is required and must be a string');
            }

            // 제한값 검증
            const finalLimit = this.validateLimit(limit);

            // 1단계: SQL 유효성 검사
            this.validateSqlQuery(sql_query);

            // 2단계: SQL에 LIMIT 적용 (필요한 경우)
            const processedSql = this.applySqlLimit(sql_query, finalLimit);

            // 3단계: CDS DB 연결 및 쿼리 실행
            this.logger.info('쿼리 실행 중...');
            const db = await cds.connect.to('db');
            const result = await db.run(processedSql);

            this.logger.info(`쿼리 실행 완료: ${result.length}개 행 반환`);

            // 4단계: 결과 반환 (데이터만)
            return JSON.stringify(result, null, 2);

        } catch (error) {
            this.logger.error('데이터베이스 쿼리 실행 실패:', error);
            throw error;
        }
    }

    /**
     * SQL 쿼리 미리보기 생성 (로깅용)
     * @param {string} sql - SQL 쿼리
     * @returns {string} 미리보기 문자열
     */
    getSqlPreview(sql) {
        if (!sql) return 'No SQL provided';
        const preview = sql.replace(/\s+/g, ' ').trim();
        return preview.length > 100 ? preview.substring(0, 100) + '...' : preview;
    }

    /**
     * 제한값 검증
     * @param {number} limit - 제한값
     * @returns {number} 검증된 제한값
     */
    validateLimit(limit) {
        const numLimit = parseInt(limit);
        if (isNaN(numLimit) || numLimit <= 0) {
            this.logger.warn(`Invalid limit value: ${limit}, using default: 100`);
            return 100;
        }
        if (numLimit > 1000) {
            this.logger.warn(`Limit too high: ${numLimit}, capping at 1000`);
            return 1000;
        }
        return numLimit;
    }

    /**
     * SQL 쿼리 유효성 검사
     * @param {string} sql - SQL 쿼리
     */
    validateSqlQuery(sql) {
        const cleanSql = sql.trim().toUpperCase();
        
        // SELECT 쿼리만 허용
        if (!cleanSql.startsWith('SELECT')) {
            throw new Error('Only SELECT queries are allowed');
        }

        // 위험한 키워드 체크
        const dangerousKeywords = [
            'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 
            'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC',
            'EXECUTE', 'MERGE', 'CALL'
        ];
        
        for (const keyword of dangerousKeywords) {
            // 단어 경계를 고려한 검사
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(cleanSql)) {
                throw new Error(`Dangerous keyword detected: ${keyword}`);
            }
        }

        // 기본적인 SQL 구문 체크
        if (!cleanSql.includes('FROM')) {
            throw new Error('Invalid SQL: FROM clause is required');
        }

        // 세미콜론으로 끝나는 경우 제거 (다중 쿼리 방지)
        if (cleanSql.includes(';')) {
            throw new Error('Multiple statements are not allowed');
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

    /**
     * WITH 절이 있는 복잡한 쿼리 체크
     * @param {string} sql - SQL 쿼리
     * @returns {boolean} WITH 절 포함 여부
     */
    hasWithClause(sql) {
        const upperSql = sql.trim().toUpperCase();
        return upperSql.startsWith('WITH');
    }

    /**
     * 서브쿼리가 있는 복잡한 쿼리 체크
     * @param {string} sql - SQL 쿼리
     * @returns {boolean} 서브쿼리 포함 여부
     */
    hasSubquery(sql) {
        const upperSql = sql.toUpperCase();
        // 괄호 안의 SELECT 감지
        return /\(\s*SELECT\s+/i.test(upperSql);
    }

    /**
     * 쿼리 복잡도 분석 (로깅용)
     * @param {string} sql - SQL 쿼리
     * @returns {Object} 복잡도 정보
     */
    analyzeQueryComplexity(sql) {
        const upperSql = sql.toUpperCase();
        
        return {
            has_join: upperSql.includes('JOIN'),
            has_group_by: upperSql.includes('GROUP BY'),
            has_order_by: upperSql.includes('ORDER BY'),
            has_having: upperSql.includes('HAVING'),
            has_with: this.hasWithClause(sql),
            has_subquery: this.hasSubquery(sql),
            estimated_complexity: this.getComplexityScore(sql)
        };
    }

    /**
     * 쿼리 복잡도 점수 계산
     * @param {string} sql - SQL 쿼리
     * @returns {string} 복잡도 레벨
     */
    getComplexityScore(sql) {
        const upperSql = sql.toUpperCase();
        let score = 0;
        
        if (upperSql.includes('JOIN')) score += 2;
        if (upperSql.includes('GROUP BY')) score += 2;
        if (upperSql.includes('HAVING')) score += 1;
        if (upperSql.includes('ORDER BY')) score += 1;
        if (this.hasWithClause(sql)) score += 3;
        if (this.hasSubquery(sql)) score += 3;
        
        // UNION 체크
        if (upperSql.includes('UNION')) score += 2;
        
        // 집계 함수 체크
        const aggregateFunctions = ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN'];
        aggregateFunctions.forEach(func => {
            if (upperSql.includes(func)) score += 1;
        });

        if (score <= 2) return 'SIMPLE';
        if (score <= 5) return 'MEDIUM';
        return 'COMPLEX';
    }

    /**
     * 쿼리 실행 전 로깅
     * @param {string} sql - SQL 쿼리
     */
    logQueryExecution(sql) {
        const complexity = this.analyzeQueryComplexity(sql);
        this.logger.info('쿼리 분석 완료', {
            complexity_level: complexity.estimated_complexity,
            has_join: complexity.has_join,
            has_aggregation: complexity.has_group_by
        });
    }
}

module.exports = QueryExecuteTool;