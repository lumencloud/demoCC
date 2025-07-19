const cds = require('@sap/cds');
const settings = require('../config/settings');
const { createLogger } = require('../util/logger');

class ReportRouteExtractTool {
    constructor() {
        this.logger = createLogger('report-route-extract-tool');
        const orgListHandler = settings.dataFetcher.apis.get_available_org_list;
        this.getAvailableOrgList = require(orgListHandler.handlerPath);
    }

    /**
     * 보고서 상세 정보 조회 (URL 추출)
     * @param {Object} inputs
     * @param {string|Array} inputs.selected_reports - 선택된 메뉴들 JSON 문자열 (report_ids)
     */
    async execute(inputs) {
        try {
            let { selected_reports } = inputs;

            if (!selected_reports) {
                throw new Error('selected_reports parameter is required');
            }

            const parsedData = JSON.parse(selected_reports);
            const { report_ids } = parsedData;

            if (!report_ids || !Array.isArray(report_ids) || report_ids.length === 0) {
                return JSON.stringify([], null, 2);
            }

            // 메뉴 ID 검증
            this.validateReportIds(report_ids);

            // CDS DB 연결
            const db = await cds.connect.to('db');

            // IN 절을 위한 쿼리 구성
            const placeholders = report_ids.map(id => `'${id}'`).join(',');
            
            const query = `
                SELECT ID
                     , NAME
                     , ROUTE_TEMPLATE
                  FROM METASTORE_REPORT 
                 WHERE ID IN (${placeholders})
                 ORDER BY ID
            `;

            const dbResult = await db.run(query);
            
            // URL 조합 함수 적용(현재 미사용)
            const result = dbResult;
            
            this.logger.info(`보고서 URL 조합 완료: ${result.length}개`);
            return JSON.stringify(result, null, 2);
        } catch (error) {
            this.logger.error('보고서 URL 조합 실패:', error);
            throw error;
        }
    }

    /**
     * 보고서 ID 유효성 검사 (SQL 인젝션 방지)
     * @param {Array} reportIds - 보고서 ID 배열
     */
    validateReportIds(reportIds) {
        for (const id of reportIds) {
            // ID 형식 검증 (영문자, 숫자, 언더스코어, 하이픈만 허용)
            if (!/^[A-Za-z0-9_-]+$/.test(id)) {
                throw new Error(`Invalid report_id format: ${id}`);
            }
        }
    }
}

module.exports = ReportRouteExtractTool;