/**
 * 등록일 : 250516
 */
namespace common;

/**
 * DT과제 SFDC I/F 테이블
 */
entity if_dt_task {
    key ver          : String(20)          @title: '인터페이스 버전';
        flag         : String(10)          @title: '인터페이스 상태';
    key dgtr_task_cd : String(30) not null @title: 'DT과제 코드';
        dgtr_task_nm : String(30) not null @title: 'DT과제 명';
        CREATEDAT    : Timestamp           @title: '인터페이스 데이터 생성일';
}
