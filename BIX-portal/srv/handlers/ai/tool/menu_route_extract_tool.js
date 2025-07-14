const cds = require('@sap/cds');
const settings = require('../config/settings');
const { createLogger } = require('../util/logger');

class MenuRouteExtractTool {
    constructor() {
        this.logger = createLogger('menu-route-extract-tool');
        const orgListHandler = settings.dataFetcher.apis.get_available_org_list;
        this.getAvailableOrgList = require(orgListHandler.handlerPath);
    }

    /**
     * 메뉴 상세 정보 조회 (URL 추출)
     * @param {Object} inputs
     * @param {string|Array} inputs.selected_menus - 선택된 메뉴들 JSON 문자열 (menu_ids, org_name, view_item)
     * @param {string} [inputs.org_id] - 조직 ID (기본값: settings에서 가져옴)
     * @param {string} [inputs.item] - 아이템
     */
    async execute(inputs) {
        try {
            let { selected_menus, org_id, item } = inputs;

            if (!selected_menus) {
                throw new Error('selected_menus parameter is required');
            }

            const parsedData = JSON.parse(selected_menus);
            const { menu_ids, org_name, view_item } = parsedData;

            if (!menu_ids || !Array.isArray(menu_ids) || menu_ids.length === 0) {
                return JSON.stringify([], null, 2);
            }

            // 메뉴 ID 검증
            this.validateMenuIds(menu_ids);

            this.logger.info(`메뉴 URL 조합: ${menu_ids.join(', ')}, org_name: ${org_name}, view_item: ${view_item}`);

            // org_name이 있으면 org_id로 변환
            if (org_name) {
                const convertedOrgId = await this.getOrgIdByName(org_name);
                if (convertedOrgId) {
                    org_id = convertedOrgId; // 직접 변경
                }
            }

            // view_item이 있으면 item에 대입
            if (view_item) {
                item = view_item;
            }

            // CDS DB 연결
            const db = await cds.connect.to('db');

            // IN 절을 위한 쿼리 구성
            const placeholders = menu_ids.map(id => `'${id}'`).join(',');
            
            const query = `
                SELECT ID
                     , NAME
                     , ROUTE_TEMPLATE
                     , AVAILABLE_ITEMS
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
     * 조직명으로 조직 ID 조회
     * @param {string} org_name - 조직명
     * @returns {string} 조직 ID
     */
    async getOrgIdByName(org_name) {
        try {
            this.logger.info(`조직명으로 조직 ID 조회 시도: ${org_name}`);
            
            // 전체 조직 조회 권한으로 고정
            const mockReq = {
                org_name: org_name,
                user: { 
                    is: (role) => role === "bix-portal-company-viewer", // 전체 조직 조회 권한
                    attr: {}
                }
            };
    
            const orgList = await this.getAvailableOrgList(mockReq);
            
            if (orgList && orgList.length > 0) {
                const foundOrg = orgList[0]; // 첫 번째 결과 사용
                this.logger.info(`조직 ID 조회 성공: ${org_name} → ${foundOrg.org_id}`);
                return foundOrg.org_id;
            }
            else {
                this.logger.warn(`조직명에 해당하는 조직을 찾을 수 없음: ${org_name}`);
                return null;
            }
        } catch (error) {
            this.logger.warn(`조직 ID 조회 실패 (null 반환): ${org_name}`, error);
            return null;
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
        const finalItem = item || this.getDefaultItem(menu.AVAILABLE_ITEMS);
        
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