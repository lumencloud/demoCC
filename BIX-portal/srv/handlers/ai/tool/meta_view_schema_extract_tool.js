const cds = require('@sap/cds');
const { createLogger } = require('../util/logger');

class MetaViewSchemaExtractTool {
    constructor() {
        this.logger = createLogger('meta-view-schema-extract-tool');
    }

    /**
     * 뷰 테이블 스키마 조회
     * @param {Object} inputs
     * @param {string} inputs.table_name - 단일 테이블명 조회
     * @param {Array<string>} inputs.table_names - 다중 테이블명 조회
     */
    async execute(inputs) {
        try {
            const { table_name, table_names } = inputs;

            // 입력 파라미터 검증 및 정규화
            let targetTables;
            let isSingleTable = false;

            if (table_name && table_names) {
                throw new Error('table_name과 table_names를 동시에 사용할 수 없습니다');
            }

            if (table_name) {
                if (Array.isArray(table_name)) {
                    throw new Error('table_name은 문자열이어야 합니다. 다중 테이블은 table_names를 사용하세요');
                }
                targetTables = [table_name];
                isSingleTable = true;
            }
            else if (table_names) {
                if (!Array.isArray(table_names)) {
                    throw new Error('table_names는 배열이어야 합니다');
                }
                const validTableNames = table_names.filter(name => name && name.trim());
                if (validTableNames.length === 0) {
                    throw new Error('유효한 table_names가 없습니다');
                }
                targetTables = validTableNames;
                isSingleTable = false;
            }
            else {
                throw new Error('table_name 또는 table_names 중 하나가 필요합니다');
            }

            this.logger.info(`스키마 조회: ${targetTables.join(', ')}`);

            const db = await cds.connect.to('db');
            const placeholders = targetTables.map(() => '?').join(',');

            // 테이블 정보 조회
            const tableQuery = `
                SELECT NAME
                     , KOR_NAME
                     , COALESCE(NULLIF(USER_DESCRIPTION, ''), DESCRIPTION) AS DESCRIPTION
                  FROM METASTORE_TABLE
                 WHERE NAME IN (${placeholders})
                   AND IS_AI_TARGET = TRUE
            `;

            // 컬럼 정보 조회
            const columnQuery = `
                SELECT C.NAME
                     , C.KOR_NAME
                     , COALESCE(NULLIF(C.USER_DESCRIPTION, ''), C.DESCRIPTION) AS DESCRIPTION
                     , C.DATA_TYPE
                     , C.TERM_NAME
                     , C.IS_PK
                     , C.DOMAIN
                     , C.TABLE_NAME
                     , COALESCE(NULLIF(t.USER_DESCRIPTION, ''), t.DESCRIPTION) AS TERM_DESCRIPTION
                  FROM METASTORE_COLUMN C
                  LEFT JOIN METASTORE_TERM t
                         ON C.TERM_NAME = t.NAME
                 WHERE C.TABLE_NAME IN (${placeholders})
                   AND C.IS_AI_TARGET = TRUE
                 ORDER BY C.TABLE_NAME, C.NAME
            `;

            const [tableInfos, allColumns] = await Promise.all([
                db.run(tableQuery, targetTables, { timeout: 30000 }),
                db.run(columnQuery, targetTables, { timeout: 30000 })
            ]);

            // 결과 구성
            const result = this.buildResult(tableInfos, allColumns, targetTables, isSingleTable);

            this.logger.info(`스키마 조회 완료: ${tableInfos.length}/${targetTables.length}개 테이블, ${allColumns.length}개 컬럼`);
            
            return JSON.stringify(result, null, 2);
        } catch (error) {
            this.logger.error('MetaViewSchemaExtractTool 실행 실패:', error);
            
            // 에러 응답 구성
            const errorResponse = {
                success: false,
                error: error.message,
                processed_at: new Date().toISOString(),
                requested_tables: inputs?.table_name ? [inputs.table_name] : inputs?.table_names || []
            };
            
            return JSON.stringify(errorResponse, null, 2);
        }
    }

    /**
     * 결과 구성
     */
    buildResult(tableInfos, allColumns, requestedTableNames, isSingleTable) {
        // 테이블별로 그룹핑
        const tableMap = new Map();
        tableInfos.forEach(table => {
            tableMap.set(table.NAME, table);
        });

        const columnsByTable = new Map();
        allColumns.forEach(col => {
            if (!columnsByTable.has(col.TABLE_NAME)) {
                columnsByTable.set(col.TABLE_NAME, []);
            }
            columnsByTable.get(col.TABLE_NAME).push(col);
        });

        // 단일 테이블인 경우 기존 형태 유지 (하위 호환성)
        if (isSingleTable) {
            const tableName = requestedTableNames[0];
            const tableInfo = tableMap.get(tableName);
            const columns = columnsByTable.get(tableName) || [];
            
            if (!tableInfo) {
                this.logger.warn(`테이블을 찾을 수 없음: ${tableName}`);
                return { schema: {} };
            }

            return this.buildSchemaResult(tableInfo, columns);
        }

        // 다중 테이블인 경우 병합된 형태로 반환
        const notFoundTables = requestedTableNames.filter(name => !tableMap.has(name));
        
        // 찾지 못한 테이블 로깅
        if (notFoundTables.length > 0) {
            this.logger.warn(`찾을 수 없는 테이블들: ${notFoundTables.join(', ')}`);
        }
        
        const result = { schema: {} };

        requestedTableNames.forEach(tableName => {
            const tableInfo = tableMap.get(tableName);
            const columns = columnsByTable.get(tableName) || [];
            
            if (tableInfo) {
                const tableSchema = this.buildSchemaResult(tableInfo, columns);
                Object.assign(result.schema, tableSchema);
            }
            else {
                this.logger.warn(`테이블을 찾을 수 없음: ${tableName}`);
                result.schema[tableName] = { 
                    desc: '테이블을 찾을 수 없음', 
                    cols: {}
                };
            }
        });

        return result;
    }
    
    buildSchemaResult(tableData, columns) {
        const tableName = tableData.NAME;
        const result = {
            [tableName]: {
                desc: tableData.DESCRIPTION || '',
                cols: {}
            }
        };
    
        // 월별 컬럼 그룹핑을 위한 Map
        const monthlyGroups = new Map();
        const regularColumns = [];
    
        // 컬럼 분류 (월별 vs 일반)
        columns.forEach(col => {
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
                result[tableName].cols[col.NAME] = columnInfo;
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
    
            result[tableName].cols[pattern] = columnInfo;
        });
    
        return result;
    }

    /**
     * 테이블 정보 구성 (null 값 제외)
     * @param {Object} tableData - 테이블 데이터
     * @returns {Object} 테이블 정보
     */
    buildTableInfo(tableData) {
        const info = {};
        
        if (tableData.NAME) info.name = tableData.NAME;
        if (tableData.KOR_NAME) info.korean_name = tableData.KOR_NAME;
        if (tableData.DESCRIPTION) info.description = tableData.DESCRIPTION;
        
        return info;
    }

    /**
     * 컬럼 정보 구성 (null 값 제외)
     * @param {Object} columnData - 컬럼 데이터
     * @returns {Object|null} 컬럼 정보 (필수 필드가 없으면 null 반환)
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
     * 월별 컬럼인지 확인
     */
    isMonthlyColumn(columnName) {
        return /_(M\d{1,2})_/.test(columnName) || /_M\d{1,2}$/.test(columnName);
    }

    /**
     * 월별 컬럼의 패턴 추출 (M1, M2 등을 *로 변경)
     */
    getMonthlyPattern(columnName) {
        return columnName.replace(/(M\d{1,2})/g, '*');
    }

    /**
     * 월별 컬럼 설명에서 기본 설명 추출 (월 정보 제거)
     */
    getBaseDescription(description) {
        if (!description) return '';
            
        return description
            .replace(/\d{1,2}월\s*/g, '') // "1월", "12월" 제거
            .replace(/\s*\d{1,2}월/g, '') // "1월", "12월" 제거
            .replace(/^\s+|\s+$/g, ''); // 앞뒤 공백 제거
    }
}

module.exports = MetaViewSchemaExtractTool;