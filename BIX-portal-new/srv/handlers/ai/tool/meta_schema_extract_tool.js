const cds = require('@sap/cds');
const { createLogger } = require('../util/logger');

/**
 * 메타스토어 스키마 추출 도구 클래스
 */
class MetaSchemaExtractTool {
    constructor() {
        this.logger = createLogger('meta-schema-extract-tool');
    }

    /**
     * 도구 실행 - 선택된 테이블들의 Text2SQL용 스키마 JSON 생성
     * @param {Object} inputs - 입력 파라미터
     * @param {string} inputs.relevant_tables - 관련 테이블 정보 (JSON 문자열)
     * @returns {Promise<string>} Text2SQL용 스키마 JSON
     */
    async execute(inputs) {
        try {
            this.logger.info('메타 스키마 추출 시작', {inputs});
            
            const { relevant_tables } = inputs;

            // 필수 파라미터 체크
            if (!relevant_tables) {
                throw new Error('relevant_tables is required');
            }

            // JSON 문자열 파싱
            let parsedTables;
            try {
                parsedTables = JSON.parse(relevant_tables);
            } catch (error) {
                throw new Error(`Invalid JSON in relevant_tables: ${error.message}`);
            }

            // selected_tables 배열 추출
            const table_names = parsedTables.selected_tables;
            
            if (!table_names || !Array.isArray(table_names) || table_names.length === 0) {
                throw new Error('selected_tables is required and must be a non-empty array');
            }

            this.logger.info(`선택된 테이블: ${table_names.join(', ')}`);
            if (parsedTables.reasoning) {
                this.logger.info(`선택 이유: ${parsedTables.reasoning}`);
            }

            // CDS DB 연결
            const db = await cds.connect.to('db');

            this.logger.info(`테이블 메타데이터 조회: ${table_names.length}개 테이블`);

            // 테이블 메타데이터 조회
            const tableQuery = `
                SELECT NAME
                     , KOR_NAME
                     , DESCRIPTION 
                  FROM METASTORE_TABLE 
                 WHERE NAME IN (${table_names.map(() => '?').join(',')})
                   AND IS_AI_TARGET = TRUE
            `;

            // 컬럼 메타데이터 조회
            const columnQuery = `
                SELECT TABLE_NAME
                     , NAME
                     , KOR_NAME
                     , DESCRIPTION
                     , DATA_TYPE
                     , DOMAIN
                     , IS_PK
                     , IS_FK
                  FROM METASTORE_COLUMN
                 WHERE TABLE_NAME IN (${table_names.map(() => '?').join(',')})
                   AND IS_AI_TARGET = TRUE
                 ORDER BY TABLE_NAME, NAME
            `;

            // 병렬 쿼리 실행
            const [tables, columns] = await Promise.all([
                db.run(tableQuery, table_names),
                db.run(columnQuery, table_names)
            ]);

            this.logger.info(`메타데이터 조회 완료: 테이블 ${tables.length}개, 컬럼 ${columns.length}개`);

            // 조회된 테이블이 없는 경우 체크
            if (tables.length === 0) {
                this.logger.warn(`선택된 테이블들이 메타스토어에 없음: ${table_names.join(', ')}`);
                throw new Error(`No tables found in metastore for: ${table_names.join(', ')}`);
            }

            // Text2SQL용 스키마 JSON 변환
            const schemaJson = this.convertToText2SqlSchema(tables, columns);

            this.logger.info(`스키마 JSON 생성 완료: ${Object.keys(schemaJson.schema).length}개 테이블`);
            return JSON.stringify(schemaJson, null, 2);

        } catch (error) {
            this.logger.error('메타 스키마 추출 실패:', error);
            throw error;
        }
    }

    /**
     * 메타데이터를 Text2SQL용 JSON으로 변환
     * @param {Array} tables - 테이블 메타데이터
     * @param {Array} columns - 컬럼 메타데이터
     * @returns {Object} Text2SQL용 스키마 JSON
     */
    convertToText2SqlSchema(tables, columns) {
        const schema = {};

        // 테이블별로 그룹핑
        const tableMap = new Map();
        tables.forEach(table => {
            // 대문자 필드명으로 수정
            tableMap.set(table.NAME, table);
        });

        // 컬럼별로 그룹핑
        const columnsByTable = new Map();
        columns.forEach(column => {
            // 대문자 필드명으로 수정
            if (!columnsByTable.has(column.TABLE_NAME)) {
                columnsByTable.set(column.TABLE_NAME, []);
            }
            columnsByTable.get(column.TABLE_NAME).push(column);
        });

        // 각 테이블별로 스키마 생성
        tableMap.forEach((table, tableName) => {
            const tableColumns = columnsByTable.get(tableName) || [];
            
            schema[tableName] = {
                desc: this.getTableDescription(table),
                cols: this.convertColumns(tableColumns)
            };
        });

        return { schema };
    }

    /**
     * 테이블 설명 생성
     * @param {Object} table - 테이블 메타데이터
     * @returns {string} 테이블 설명
     */
    getTableDescription(table) {
        // 대문자 필드명으로 수정
        return table.KOR_NAME || table.DESCRIPTION || table.NAME;
    }

    /**
     * 컬럼 정렬
     * @param {Array} columns - 컬럼 목록
     * @returns {Array} 정렬된 컬럼 목록
     */
    sortColumns(columns) {
        // 유효한 컬럼만 필터링
        const validColumns = columns.filter(column => 
            column && column.NAME && typeof column.NAME === 'string'
        );

        return validColumns.sort((a, b) => {
            // PK 컬럼 우선 (대문자 필드명)
            if (a.IS_PK && !b.IS_PK) return -1;
            if (!a.IS_PK && b.IS_PK) return 1;
            
            // 그 다음은 컬럼명 순
            return a.NAME.localeCompare(b.NAME);
        });
    }

    /**
     * 월별 패턴 컬럼들을 찾기
     * @param {Array} columns - 컬럼 목록
     * @returns {Array} 월별 패턴 정보
     */
    findMonthlyPatterns(columns) {
        const patterns = new Map();
        
        columns.forEach(column => {
            // 대문자 필드명으로 수정
            if (!column || !column.NAME || typeof column.NAME !== 'string') {
                this.logger.warn('Invalid column name found:', column);
                return;
            }

            const match = column.NAME.match(/^(.+)_M(\d{1,2})(_\w+)?$/);
            if (match) {
                const [, prefix, month, suffix] = match;
                const patternKey = `${prefix}_*${suffix || ''}`;
                
                if (!patterns.has(patternKey)) {
                    patterns.set(patternKey, {
                        pattern: patternKey,
                        prefix: prefix,
                        suffix: suffix || '',
                        columns: [],
                        sampleColumn: column
                    });
                }
                patterns.get(patternKey).columns.push(column.NAME);
            }
        });

        return Array.from(patterns.values()).filter(p => p.columns.length >= 2);
    }

    /**
     * 특정 컬럼이 월별 패턴에 속하는지 확인
     * @param {string} columnName - 컬럼명
     * @param {Array} monthlyPatterns - 월별 패턴 목록
     * @returns {Object|null} 패턴 정보 또는 null
     */
    getMonthlyPattern(columnName, monthlyPatterns) {
        return monthlyPatterns.find(pattern => 
            pattern.columns.includes(columnName)
        ) || null;
    }

    /**
     * 컬럼 데이터를 Text2SQL JSON 형태로 변환
     * @param {Array} columns - 컬럼 메타데이터
     * @returns {Object} 컬럼 스키마
     */
    convertColumns(columns) {
        const cols = {};
        
        // 유효한 컬럼만 필터링 (대문자 필드명)
        const validColumns = columns.filter(column => 
            column && column.NAME && typeof column.NAME === 'string'
        );

        if (validColumns.length === 0) {
            this.logger.warn('No valid columns found');
            return cols;
        }
        
        // 월별 패턴 분석
        const monthlyPatterns = this.findMonthlyPatterns(validColumns);

        // 정렬 (PK 먼저, 그 다음 일반 컬럼)
        const sortedColumns = this.sortColumns(validColumns);

        const processedColumns = new Set();

        sortedColumns.forEach(column => {
            // 이미 처리된 월별 패턴 컬럼은 스킵
            if (processedColumns.has(column.NAME)) return;

            const monthlyPattern = this.getMonthlyPattern(column.NAME, monthlyPatterns);
            
            if (monthlyPattern) {
                // 월별 패턴 컬럼 처리
                const patternKey = monthlyPattern.pattern;
                cols[patternKey] = this.createColumnSchema(
                    monthlyPattern.sampleColumn, 
                    true
                );
                
                // 해당 패턴의 모든 컬럼을 처리됨으로 표시
                monthlyPattern.columns.forEach(colName => {
                    processedColumns.add(colName);
                });
            } else {
                // 일반 컬럼 처리
                cols[column.NAME] = this.createColumnSchema(column, false);
                processedColumns.add(column.NAME);
            }
        });

        return cols;
    }

    /**
     * 개별 컬럼 스키마 생성
     * @param {Object} column - 컬럼 메타데이터
     * @param {boolean} isMonthly - 월별 패턴 컬럼 여부
     * @returns {Object} 컬럼 스키마
     */
    createColumnSchema(column, isMonthly) {
        // 안전성 체크 (대문자 필드명)
        if (!column || !column.NAME) {
            this.logger.warn('Invalid column in createColumnSchema:', column);
            return {
                type: 'NVARCHAR',
                desc: 'Unknown Column'
            };
        }

        const schema = {
            type: this.normalizeDataType(column.DATA_TYPE),
            desc: this.getColumnDescription(column)
        };

        // PK 정보 추가 (대문자 필드명)
        if (column.IS_PK) {
            schema.pk = true;
        }

        // 도메인 정보 추가 (대문자 필드명)
        if (column.DOMAIN) {
            const domainValues = this.parseDomain(column.DOMAIN);
            if (domainValues && domainValues.length > 0) {
                schema.domain = domainValues;
            }
        }

        // 월별 패턴 정보 추가
        if (isMonthly) {
            schema.monthly = "M1-M12";
        }

        return schema;
    }

    /**
     * 컬럼 설명 생성
     * @param {Object} column - 컬럼 메타데이터
     * @returns {string} 컬럼 설명
     */
    getColumnDescription(column) {
        // 대문자 필드명으로 수정
        return column.KOR_NAME || column.DESCRIPTION || column.NAME;
    }

    /**
     * 도메인 값 파싱
     * @param {string} domain - 도메인 문자열
     * @returns {Array|null} 파싱된 도메인 값들
     */
    parseDomain(domain) {
        if (!domain) return null;
        
        try {
            // JSON 형태로 파싱 시도
            const parsed = JSON.parse(domain);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            // JSON 파싱 실패시 쉼표로 분리
            if (domain.includes(',')) {
                return domain.split(',').map(s => s.trim()).filter(s => s.length > 0);
            }
        }
        
        return null;
    }

    /**
     * 데이터 타입 정규화
     * @param {string} dataType - 원본 데이터 타입
     * @returns {string} 정규화된 데이터 타입
     */
    normalizeDataType(dataType) {
        if (!dataType) return 'NVARCHAR';
        
        const type = dataType.toUpperCase();
        if (type.includes('VARCHAR') || type.includes('CHAR')) return 'NVARCHAR';
        if (type.includes('DECIMAL') || type.includes('NUMERIC')) return 'DECIMAL';
        if (type.includes('INT')) return 'INTEGER';
        if (type.includes('BOOL')) return 'BOOLEAN';
        if (type.includes('DATE')) return 'DATE';
        if (type.includes('TIME')) return 'TIMESTAMP';
        
        return dataType;
    }
}

module.exports = MetaSchemaExtractTool;