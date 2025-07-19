const cds = require('@sap/cds');
const settings = require('../config/settings');
const { createLogger } = require('../util/logger');

class ReportListTool {
    constructor() {
        this.logger = createLogger('report-list-tool');
    }

    /**
     * 보고서 목록 조회
     * @param {Object} inputs - 입력 파라미터 (현재는 사용하지 않음)
     */
    async execute(inputs) {
        try {
            const { filters = [] } = inputs;

            this.logger.info('보고서 목록 조회 시작');

            // CDS DB 연결
            const db = await cds.connect.to('db');

            const query = `
                SELECT ID AS REPORT_ID
                     , NAME
                     , DESCRIPTION
                     , TRIGGER_PATTERNS
                  FROM METASTORE_REPORT
                 WHERE TYPE != 'T'
                 ORDER BY ID
            `;

            const reportList = await db.run(query);
            
            const enhancedReportList = reportList.map(report => ({
                REPORT_ID: report.REPORT_ID,
                NAME: report.NAME,
                DESCRIPTION: report.DESCRIPTION,
                TRIGGER_PATTERNS: report.TRIGGER_PATTERNS
            }));
            
            this.logger.info(`메뉴 목록 조회 완료: ${enhancedReportList.length}개`);
            return JSON.stringify(enhancedReportList, null, 2);
        } catch (error) {
            this.logger.error('메뉴 목록 조회 실패:', error);
            throw error;
        }
    }
}

module.exports = ReportListTool;