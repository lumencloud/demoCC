const cds = require('@sap/cds');
const { createLogger } = require('../util/logger');

/**
 * 메타스토어 테이블 목록 조회 도구 클래스
 */
class MetaTableListTool {
    constructor() {
        this.logger = createLogger('meta-table-list-tool');
    }

    async execute(inputs) {
        try {
            this.logger.info('메타스토어 테이블 목록 조회 시작', {inputs});
            
            const { 
                business_domain = null,
                search_keyword = null,
                sort_by = 'business_domain'
            } = inputs;

            // CDS DB 연결
            const db = await cds.connect.to('db');

            // SQL 쿼리 작성
            let query = `
                SELECT NAME
                     , BUSINESS_DOMAIN
                     , KOR_NAME
                     , COALESCE(NULLIF(USER_DESCRIPTION, ''), DESCRIPTION) AS DESCRIPTION
                  FROM METASTORE_TABLE 
                 WHERE IS_AI_TARGET = TRUE
                   AND TYPE = 'TABLE'
            `;

            const params = [];
            
            if (business_domain) {
                query += ` AND BUSINESS_DOMAIN = ?`;
                params.push(business_domain);
            }

            // 정렬 추가
            const sortColumn = this.getSortColumn(sort_by);
            query += ` ORDER BY ${sortColumn}`;

            // 쿼리 실행
            const result = await db.run(query, params);

            this.logger.info(`테이블 조회 완료: ${result.length}개 테이블`);

            // 키워드 필터링 (후처리)
            let tableList = result;
            if (search_keyword) {
                tableList = this.filterByKeyword(result, search_keyword);
                this.logger.info(`키워드 필터링 완료: ${tableList.length}개 테이블`);
            }

            // 빈 결과 처리
            if (tableList.length === 0) {
                this.logger.info('조건에 맞는 테이블이 없음');
            }

            return JSON.stringify(tableList, null, 2);
        } catch (error) {
            this.logger.error('메타스토어 테이블 목록 조회 실패:', error);
            throw error;
        }
    }

    getSortColumn(sortBy) {
        switch (sortBy) {
            case 'name': 
                return 'name';
            case 'business_domain': 
                return 'business_domain, name';
            default: 
                return 'sort_order, name';
        }
    }

    filterByKeyword(tableList, keyword) {
        if (!keyword) return tableList;
        
        const searchTerm = keyword.toLowerCase();
        return tableList.filter(table => 
            table.name.toLowerCase().includes(searchTerm) ||
            (table.kor_name && table.kor_name.toLowerCase().includes(searchTerm)) ||
            (table.description && table.description.toLowerCase().includes(searchTerm))
        );
    }
}

module.exports = MetaTableListTool;