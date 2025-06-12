using {managed} from '@sap/cds/common';

namespace common;

/**
 * 조직 공통 테이블
 */
entity org : managed {
    key ver        : String(20)          @title: '인터페이스 버전';
    key id         : String(20) not null @title: '조직 ID';
        name       : String(50) not null @title: '조직 이름';
        parent     : String(10)          @title: '상위조직 ID';
        order      : String(100)         @title: '소팅 순서';
        str_dt     : String(10)          @title: '시작일';
        end_dt     : String(10)          @title: '종료일';
        use_yn     : Boolean             @title: '사용 여부';
        ccorg_cd   : String(8) not null  @title: 'ERP CC조직_코드';
        type       : String(10) not null @title: '조직 타입';
        Parent_org : Association to one org
                         on Parent_org.id = $self.parent;
        Child_org  : Association to many org
                         on Child_org.Parent_org = $self;
}
