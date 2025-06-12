using {
    managed,
    cuid
} from '@sap/cds/common';
using common as common_code from './code';

namespace common;

/**
 * pl 페이지 메뉴구성, 컨텐츠 정보
 */
entity pl_content_info : cuid, managed {
    key content_menu_code : String(20) not null @title: 'PL 메뉴 코드';
        pl_info           : String(50)  @title: 'PL 정보'; // actual <-> plan (실적 PL <-> 추정 PL)
        position          : String(10) not null @title: '마스터 디테일 위치';
        sort_order        : Integer not null    @title: '정렬순서';
        card_info         : String(50) not null @title: '카드 정보';
        grid_layout_info  : String(50)          @title: '그리드 정보';  // grid <-> table
        detail_info       : String(50)          @title: '디테일 정보';  // chart <-> detail
};
