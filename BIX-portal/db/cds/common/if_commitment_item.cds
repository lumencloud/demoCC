/**
 * 등록일 : 250410
 */

namespace common;

/**
 * 약정항목(중계정) I/F 테이블
 */
entity if_commitment_item {
    key ver                     : String(20)          @title: '인터페이스 버전';
        flag                    : String(10)          @title: '인터페이스 상태';
    key commitment_item         : String(24) not null @title: '중계정';
        description             : String(40)          @title: 'description';
        FinancialManagementArea : String(24)          @title: 'FinancialManagementArea'  @description: '[Reserved] ERP 인터페이스 API 에만 존재';
        budget_control_yn       : Boolean not null    @title: '통제 여부';
        CREATEDAT               : Timestamp           @title: '인터페이스 데이터 생성일';
}
