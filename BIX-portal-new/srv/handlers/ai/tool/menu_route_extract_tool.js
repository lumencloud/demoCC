const cds = require('@sap/cds');
const settings = require('../config/settings');
const { createLogger } = require('../util/logger');

class MenuRouteExtractTool {
    constructor() {
        this.logger = createLogger('menu-route-extract-tool');
    }

    /**
     * 메뉴 상세 정보 조회 (URL 추출)
     * @param {Object} inputs
     * @param {string|Array} inputs.selected_menus - 선택된 메뉴들 JSON 문자열
     * @param {string} [inputs.org_id] - 조직 ID (기본값: settings에서 가져옴)
     * @param {string} [inputs.item] - 아이템
     */
    async execute(inputs) {
        try {
            const { selected_menus, org_id, item } = inputs;

            if (!selected_menus) {
                throw new Error('selected_menus parameter is required');
            }

            const parsedData = JSON.parse(selected_menus);
            const menuIds = parsedData.menu_ids;

            if (!menuIds || !Array.isArray(menuIds) || menuIds.length === 0) {
                return JSON.stringify([], null, 2);
            }

            // 메뉴 ID 검증
            this.validateMenuIds(menuIds);

            this.logger.info(`메뉴 URL 조합: ${menuIds.join(', ')}`);

            // CDS DB 연결
            const db = await cds.connect.to('db');

            // IN 절을 위한 쿼리 구성
            const placeholders = menuIds.map(id => `'${id}'`).join(',');
            
            const query = `
                SELECT ID
                     , NAME
                     , ROUTE_TEMPLATE
                     , AVAILABLEITEMS
                  FROM METASTORE_MENU 
                 WHERE ID IN (${placeholders})
                   AND IS_USE = TRUE
                   AND IS_SYSTEM = FALSE
                 ORDER BY ID
            `;

            const dbResult = await db.run(query);
            
            // URL 조합
            const result = dbResult.map(menu => this.buildMenuUrl(menu, org_id, item));
            
            this.logger.info(`메뉴 URL 조합 완료: ${result.length}개`);
            return JSON.stringify(result, null, 2);

        } catch (error) {
            this.logger.error('메뉴 URL 조합 실패:', error);
            throw error;
        }
    }

    /**
     * 메뉴별 URL 조합
     * @param {Object} menu - 메뉴 데이터
     * @param {string} org_id - 조직 ID
     * @param {string} item - 아이템
     * @returns {Object} 조합된 메뉴 정보
     */
    buildMenuUrl(menu, org_id, item) {
        // 파라미터 결정
        const finalOrgId = org_id || settings.menu.settings.defaults.org_id;
        const finalItem = item || this.getDefaultItem(menu.AVAILABLEITEMS);

        // URL 조합
        let completedUrl = menu.ROUTE_TEMPLATE || '';
        completedUrl = completedUrl.replace(/{org_id}/g, finalOrgId);
        if (finalItem) {
            completedUrl = completedUrl.replace(/{item}/g, finalItem);
        }

        return {
            id: menu.ID,
            name: menu.NAME,
            url: completedUrl
        };
    }

    /**
     * availableItems에서 기본 item 추출
     * @param {string} availableItems - 사용 가능한 아이템들
     * @returns {string|null} 기본 아이템
     */
    getDefaultItem(availableItems) {
        if (!availableItems) return null;

        const firstItem = availableItems.split(',')[0]?.trim();
        if (!firstItem) return null;

        // "key: value" 형태면 value 추출, 아니면 key 사용
        const colonIndex = firstItem.indexOf(':');
        return colonIndex > -1 
            ? firstItem.substring(colonIndex + 1).trim() || firstItem.substring(0, colonIndex).trim()
            : firstItem;
    }

    /**
     * 메뉴 ID 유효성 검사 (SQL 인젝션 방지)
     * @param {Array} menuIds - 메뉴 ID 배열
     */
    validateMenuIds(menuIds) {
        for (const id of menuIds) {
            // ID 형식 검증 (영문자, 숫자, 언더스코어, 하이픈만 허용)
            if (!/^[A-Za-z0-9_-]+$/.test(id)) {
                throw new Error(`Invalid menu_id format: ${id}`);
            }
        }
    }
}

module.exports = MenuRouteExtractTool;