/**
 * 등록일 : 250410
 */

namespace common;

/**
 * 사원-조직 매핑 I/F 테이블
 */
entity if_org_map {
    key ver            : String(20)  @title: '인터페이스 버전';
        flag           : String(10)  @title: '인터페이스 상태';
    key emp_no         : String(20)  @title: '사번';
    key org_id         : String(20)  @title: '조직 ID';
        sdate          : String(25)  @title: '발령 날짜';
        edate          : String(25)  @title: '전출 일자';
        primary_status : String(1)   @title: '원소속조직 여부';
        jikcheak_id    : String(25)  @title: '직책 ID';
        jikmu_id       : String(1)   @title: '직무 ID';
        formal_status  : String(1)   @title: '정규직 여부';
        order_type     : String(25)  @title: '근무형태(파견, 겸직, full)';
        create_date    : Timestamp   @title: '생성시간';
        closed_date    : Timestamp   @title: '종료일자';
        eai_pcs_dttm   : Timestamp   @title: 'EAI I/F 처리시간';
        eai_data_seq   : Integer     @title: 'EAI 시퀀스';
        eai_crud_cd    : String(1)   @title: 'EAI 처리 코드';
        create_time    : Timestamp   @title: '생성 시간';
        create_user_id : String(255) @title: '생성자';
        change_time    : Timestamp   @title: '변경 시간';
        change_user_id : String(255) @title: '변경자';
}
