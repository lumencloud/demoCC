/**
 * 등록일 : 250410
 */

using {managed} from '@sap/cds/common';

namespace common;

/**
 * GL 계정 테이블 테이블
 */
entity gl_account_test : managed {
    key ver             : String(20)          @title: '인터페이스 버전';
    key gl_account      : String(10) not null @title: '계정코드';
    key commitment_item : String(24) not null @title: '중계정';
        name            : String(40)          @title: 'description';
}
