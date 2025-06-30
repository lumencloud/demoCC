using {managed} from '@sap/cds/common';


namespace common;

/**
 * batch_list 배치 대상 정보를 관리하는 테이블
 */
entity batch_list : managed {
    key procedure_no   : Integer    not null            @title: '프로시저 고유 번호';
        procedure_name : String(50) not null            @title: '프로시저 이름';
    key procedure_type : String(1)  not null            @title: '프로시저 Type(P:PL, D:SFDC(Deal))';
        source_type    : String(20) not null            @title: 'source';        
        memo           : String(100)                    @title: '프로시저 설명';        
        use_yn         : Boolean default true not null  @title: '사용 유무';
}
