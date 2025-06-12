/**
 * 등록일 : 250410
 */

using {managed} from '@sap/cds/common';

namespace common;

/**
 * 사원-조직 매핑 테이블
 */
entity org_map : managed {
    key ver             : String(20)          @title: '인터페이스 버전';
    key emp_no          : String(20) not null @title: '사번';
    key org_id          : String(20) not null @title: '조직 ID';
        str_date        : String(25)          @title: '발령 날짜';
        end_date        : String(25)          @title: '전출 일자';
        primary_status  : String(1)           @title: '원소속조직 여부';
        formal_status   : String(1)           @title: '정규직 여부';
        order_type      : String(25)          @title: '근무형태(파견, 겸직, full)';
        create_datetime : Timestamp           @title: '생성시간';
        closed_dt       : Timestamp           @title: 'closed_date';
        create_user_id  : String(255)         @title: '생성자';
        change_time     : Timestamp           @title: '변경 시간';
        change_user_id  : String(25)          @title: '변경자';
}
