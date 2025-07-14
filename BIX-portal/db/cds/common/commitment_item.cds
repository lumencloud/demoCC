/**
 * 등록일 : 250410
 */

using {managed} from '@sap/cds/common';

namespace common;

/**
 * 약정항목(중계정) 테이블
 */
entity commitment_item : managed {
    key ver               : String(20)          @title: '인터페이스 버전';
    key commitment_item   : String(24) not null @title: '중계정';
        description       : String(40)          @title: '중계정 정보';
        budget_control_yn : Boolean not null    @title: '통제 여부';
}
