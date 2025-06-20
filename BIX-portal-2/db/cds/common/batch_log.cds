using {managed} from '@sap/cds/common';
using {common.batch_list as batch_list_table} from './batch_list';

namespace common;

/**
 * batch_log 배치 로그를 관리하는 테이블
 */
entity batch_log : managed {
    key ver                 : String(20) not null                                          @title: '버전 번호';
    key procedure_no        : Integer not null                                             @title: '프로시저 번호';
        procedure_no_detail : Association to batch_list_table
                                  on procedure_no_detail.procedure_no = $self.procedure_no @title: '프로시저 번호 상세';
    key procedure_type      : String(1) not null                                           @title: '프로시저 Type(P:PL, D:SFDC(Deal))';
        procedure_type_detail : Association to batch_list_table
                                  on procedure_type_detail.procedure_type = $self.procedure_type;    
        success_yn          : Boolean                                                      @title: '성공 여부';
        log                 : String(500)                                                  @title: '로그';
}
