const cds = require('@sap/cds');
const settings = require('../config/settings');
const { createLogger } = require('../util/logger');

class MenuListTool {
    constructor() {
        this.logger = createLogger('menu-list-tool');
    }

    /**
     * 메뉴 목록 조회
     * @param {Object} inputs - 입력 파라미터 (현재는 사용하지 않음)
     */
    async execute(inputs) {
        try {
            const { filters = [] } = inputs;

            this.logger.info('네비게이터 메뉴 목록 조회 시작');

            // CDS DB 연결
            const db = await cds.connect.to('db');

            const query = `
                SELECT ID AS MENU_ID
                     , NAME
                     , DESCRIPTION
                     , TRIGGER_PATTERNS
                     , AVAILABLEITEMS
                  FROM METASTORE_MENU
                 WHERE IS_USE = TRUE 
                   AND IS_SYSTEM = FALSE
                 ORDER BY ID
            `;

            const menuList = await db.run(query);
            
            // 사용자 질문에서 추출 가능한 item 옵션만 포함
            const enhancedMenuList = menuList.map(menu => ({
                MENU_ID: menu.MENU_ID,
                NAME: menu.NAME,
                DESCRIPTION: menu.DESCRIPTION,
                TRIGGER_PATTERNS: menu.TRIGGER_PATTERNS,
                ITEM_OPTIONS: this.getItemOptions(menu.AVAILABLEITEMS)
            }));
            
            this.logger.info(`메뉴 목록 조회 완료: ${enhancedMenuList.length}개`);
            
            return JSON.stringify(enhancedMenuList, null, 2);
        } catch (error) {
            this.logger.error('메뉴 목록 조회 실패:', error);
            throw error;
        }
    }

    /**
     * availableItems에서 item 옵션들 추출
     * @param {string} availableItems 
     * @returns {Array} item 옵션 정보
     */
    getItemOptions(availableItems) {
        if (!availableItems) {
            return [];
        }

        const options = [];
        const itemPairs = availableItems.split(',');
        
        itemPairs.forEach(item => {
            const trimmedItem = item.trim();
            if (trimmedItem) {
                const colonIndex = trimmedItem.indexOf(':');
                const code = colonIndex > -1 
                    ? trimmedItem.substring(0, colonIndex).trim()
                    : trimmedItem;

                const name = settings.menu.settings.itemCodeNames[code] || code;

                options.push({
                    code: code,
                    name: name
                });
            }
        });

        return options;
    }
}

module.exports = MenuListTool;