using {managed} from '@sap/cds/common';

namespace common;

/**
 * 조직 공통 테이블
 */
entity dashboard_favorite : managed {
    key user_id : String(20) @title: '사용자 ID';
    key chart_id : String(50) @title: '즐겨찾기 ID';
}
