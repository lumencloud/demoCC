using {managed} from '@sap/cds/common';

namespace common;

/**
 * DT과제 마스터 테이블
 */
entity dt_task : managed {
        ver          : String(20)          @title: '인터페이스 버전';
    key dgtr_task_cd : String(30) not null @title: 'DT과제 코드';
        dgtr_task_nm : String(30) not null @title: 'DT과제 명';
        sort_order   : Integer             @title: '정렬순서';
}
