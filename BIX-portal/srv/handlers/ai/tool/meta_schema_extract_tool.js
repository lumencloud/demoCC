const cds = require('@sap/cds');
const { createLogger } = require('../util/logger');

/**
 * 메타스토어 스키마를 추출하는 도구
 */
class MetaSchemaExtractTool {
    constructor() {
        this.logger = createLogger('meta-schema-extract-tool');
    }

    /**
     * 테이블 스키마 정보를 Text2SQL 형태로 추출
     * @param {Object} inputs - 입력 파라미터
     * @param {string} inputs.relevant_tables - 관련 테이블 정보 (JSON 문자열)
     * @returns {Promise<string>} JSON 형태의 스키마 정보
     */
    async execute(inputs) {
        try {
            const { relevant_tables } = inputs;

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
                this.logger.info('선택된 테이블이 없어 빈 스키마 반환');
                return JSON.stringify({ schema: {} }, null, 2);
            }

            this.logger.info(`스키마 추출: ${table_names.join(', ')}`);

            const db = await cds.connect.to('db');

            // 테이블 정보 조회
            const tableQuery = `
                SELECT NAME
                     , KOR_NAME
                     , COALESCE(NULLIF(USER_DESCRIPTION, ''), DESCRIPTION) AS DESCRIPTION
                FROM METASTORE_TABLE
                WHERE NAME IN (${table_names.map(() => '?').join(',')})
                  AND IS_AI_TARGET = TRUE
            `;

            // 컬럼 정보 조회
            const columnQuery = `
                SELECT C.TABLE_NAME
                     , C.NAME
                     , C.KOR_NAME
                     , COALESCE(NULLIF(C.USER_DESCRIPTION, ''), C.DESCRIPTION) AS DESCRIPTION
                     , C.DATA_TYPE
                     , C.TERM_NAME
                     , C.IS_PK
                     , C.DOMAIN
                     , COALESCE(NULLIF(T.USER_DESCRIPTION, ''), T.DESCRIPTION) AS TERM_DESCRIPTION
                FROM METASTORE_COLUMN C
                LEFT JOIN METASTORE_TERM T
                    ON C.TERM_NAME = T.NAME
                WHERE C.TABLE_NAME IN (${table_names.map(() => '?').join(',')})
                  AND C.IS_AI_TARGET = TRUE
                ORDER BY C.TABLE_NAME, C.NAME
            `;

            const [tables, columns] = await Promise.all([
                db.run(tableQuery, table_names),
                db.run(columnQuery, table_names)
            ]);

            if (tables.length === 0) {
                this.logger.warn(`테이블을 찾을 수 없음: ${table_names.join(', ')}`);
                return JSON.stringify({ schema: {} }, null, 2);
            }

            const result = this.buildSchemaResult(tables, columns);

            this.logger.info(`스키마 추출 완료: ${tables.length}개 테이블, ${columns.length}개 컬럼`);
            return JSON.stringify(result, null, 2);
        } catch (error) {
            this.logger.error('스키마 추출 실패:', error);
            throw error;
        }
    }

    /**
     * 테이블과 컬럼 정보를 Text2SQL용 스키마 형태로 구성
     * @param {Array} tables - 테이블 정보 배열
     * @param {Array} columns - 컬럼 정보 배열
     * @returns {Object} Text2SQL용 스키마 객체
     */
    buildSchemaResult(tables, columns) {
        const result = [];
        
        // 테이블별로 처리
        tables.forEach(tableData => {
            const tableName = tableData.NAME;
            const tableColumns = columns.filter(col => col.TABLE_NAME === tableName);
            
            const tableSchema = {
                table_name: tableName,
                desc: tableData.DESCRIPTION || '',
                cols: {}
            };
            
            // 월별 컬럼 그룹핑을 위한 Map
            const monthlyGroups = new Map();
            const regularColumns = [];
            
            // 컬럼 분류 (월별 vs 일반)
            tableColumns.forEach(col => {
                if (this.isMonthlyColumn(col.NAME)) {
                    const basePattern = this.getMonthlyPattern(col.NAME);
                    if (!monthlyGroups.has(basePattern)) {
                        monthlyGroups.set(basePattern, {
                            pattern: basePattern,
                            name: col.KOR_NAME,
                            description: col.DESCRIPTION,
                            dataType: col.DATA_TYPE,
                            termName: col.TERM_NAME,
                            termDescription: col.TERM_DESCRIPTION,
                            domain: col.DOMAIN
                        });
                    }
                }
                else {
                    regularColumns.push(col);
                }
            });
            
            // 일반 컬럼 추가
            regularColumns.forEach(col => {
                const columnInfo = this.buildColumnInfo(col);
                if (columnInfo) {
                    tableSchema.cols[col.NAME] = columnInfo;
                }
            });
            
            // 월별 컬럼 패턴 추가
            monthlyGroups.forEach((groupInfo, pattern) => {
                const columnInfo = {
                    type: groupInfo.dataType
                };
    
                // name은 KOR_NAME에서, desc는 DESCRIPTION에서
                if (groupInfo.name) columnInfo.name = groupInfo.name;
                if (groupInfo.description) columnInfo.desc = groupInfo.description;
                
                columnInfo.monthly = "M1-M12";
                
                // 선택적 필드 추가
                if (groupInfo.domain) {
                    try {
                        columnInfo.domain = JSON.parse(groupInfo.domain);
                    } catch (e) {
                        columnInfo.domain = groupInfo.domain;
                    }
                }
                if (groupInfo.termName) columnInfo.term_name = groupInfo.termName;
                if (groupInfo.termDescription) columnInfo.term_description = groupInfo.termDescription;
                
                tableSchema.cols[pattern] = columnInfo;
            });
            
            result.push(tableSchema);
        });
        
        return result;
    }

    /**
     * 개별 컬럼 정보를 Text2SQL 형태로 구성
     * @param {Object} columnData - 컬럼 정보
     * @returns {Object|null} Text2SQL용 컬럼 객체 또는 null
     */
    buildColumnInfo(columnData) {
        // 필수 필드 체크
        if (!columnData.NAME) {
            return null;
        }

        const info = {
            type: columnData.DATA_TYPE || 'NVARCHAR'
        };

        // name은 KOR_NAME에서, desc는 DESCRIPTION에서
        if (columnData.KOR_NAME) info.name = columnData.KOR_NAME;
        if (columnData.DESCRIPTION) info.desc = columnData.DESCRIPTION;

        if (columnData.IS_PK === 'Y' || columnData.IS_PK === true) {
            info.pk = true;
        }

        if (columnData.DOMAIN) {
            try {
                info.domain = JSON.parse(columnData.DOMAIN);
            } catch (e) {
                // JSON 파싱 실패 시 문자열 그대로 사용
                info.domain = columnData.DOMAIN;
            }
        }

        // 용어 정보 (값이 있을 때만 추가)
        if (columnData.TERM_NAME) info.term_name = columnData.TERM_NAME;
        if (columnData.TERM_DESCRIPTION) info.term_description = columnData.TERM_DESCRIPTION;

        return info;
    }

    /**
     * 컬럼명이 월별 패턴(M1~M12)인지 확인
     * @param {string} columnName - 컬럼명
     * @returns {boolean} 월별 컬럼 여부
     */
    isMonthlyColumn(columnName) {
        return /_(M\d{1,2})_/.test(columnName) || /_M\d{1,2}$/.test(columnName);
    }

    /**
     * 월별 컬럼명에서 패턴 추출 (M1, M2 등을 *로 변경)
     * @param {string} columnName - 월별 컬럼명
     * @returns {string} 패턴화된 컬럼명 (예: SALE_M1_AMT → SALE_*_AMT)
     */
    getMonthlyPattern(columnName) {
        return columnName.replace(/(M\d{1,2})/g, '*');
    }

    /**
     * 월별 컬럼 설명에서 월 정보를 제거하여 기본 설명 추출 (MetaViewSchemaExtractTool과 동일)
     * @param {string} description - 원본 설명 (예: "1월 매출금액")
     * @returns {string} 월 정보가 제거된 설명 (예: "매출금액")
     */
    getBaseDescription(description) {
        if (!description) return '';
        
        return description
            .replace(/\d{1,2}월\s*/g, '') // "1월", "12월" 제거
            .replace(/\s*\d{1,2}월/g, '') // "1월", "12월" 제거
            .replace(/^\s+|\s+$/g, ''); // 앞뒤 공백 제거
    }
}

module.exports = MetaSchemaExtractTool;