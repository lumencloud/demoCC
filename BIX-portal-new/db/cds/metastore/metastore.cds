namespace metastore;

/**
 * 용어 메타데이터
 */
entity Term {
    key name                    : String(200)   @title: '용어명'            @description: '용어의 한글명';
        system_name             : String(50)    @title: '시스템명'          @description: '용어가 사용되는 시스템 이름';
        business_domain         : String(50)    @title: '업무구분'          @description: '용어의 업무 구분';
        type                    : String(1)     @title: '용어타입'          @description: 'G: 일반용어, P: 프로젝트용어';
        eng_name                : String(200)   @title: '용어영문명'        @description: '용어의 영문명';
        official_eng_name       : String(500)   @title: '영문정식명'        @description: '용어의 전체 영문 표기';
        description             : String(1000)  @title: '용어설명'          @description: '용어에 대한 개념과 의미 설명 (KPI 지표 여부, 대상 조직)';
        user_description        : String(1000)  @title: '용어사용자정의설명' @description: '용어에 대한 사용자 정의 설명 (원천 데이터, 용례)';
        calculation_method      : String(2000)  @title: '계산방법'          @description: '용어 산출에 필요한 계산식';
        last_mod_dt             : Date          @title: '최종변경일'        @description: '최종 변경일';
}

/**
 * 테이블 메타데이터
 */
entity Table {
    key name                    : String(128)   @title: '테이블명'          @description: '테이블 이름';
        system_name             : String(50)    @title: '시스템명'          @description: '테이블의 연관 시스템';
        business_domain         : String(50)    @title: '업무구분'          @description: '테이블의 업무 구분';
        type                    : String(10)    @title: '타입'              @description: '테이블 타입 (TABLE, VIEW)';
        kor_name                : String(200)   @title: '테이블한글명'      @description: '테이블의 한글 이름 또는 별칭';
        description             : String(1000)  @title: '테이블설명'        @description: '테이블의 목적과 용도에 대한 설명';
        user_description        : String(1000)  @title: '테이블사용자정의설명' @description: '테이블의 사용자 정의 설명';
        is_ai_target            : Boolean       @title: 'AI대상여부'        @description: 'AI 대상 테이블';
        last_mod_dt             : Date          @title: '최종변경일'        @description: '최종 변경일';
        
    // 관계: 해당 테이블의 컬럼들
    columns : Composition of many Column on columns.table_name = $self.name;
}

/**
 * 컬럼 메타데이터
 */
entity Column {
    key table_name              : String(128)   @title: '테이블명'          @description: '해당 컬럼이 속한 테이블 이름';
    key name                    : String(128)   @title: '컬럼명'            @description: '컬럼의 물리적 이름';
        kor_name                : String(200)   @title: '컬럼한글명'        @description: '컬럼의 한글 이름 또는 별칭';
        description             : String(1000)  @title: '컬럼설명'          @description: '컬럼의 용도와 저장되는 데이터에 대한 설명';
        user_description        : String(1000)  @title: '컬럼사용자정의설명' @description: '컬럼의 사용자 정의 설명';
        data_type               : String(50)    @title: '데이터타입'        @description: '컬럼의 데이터 타입(VARCHAR, INTEGER 등)';
        domain                  : String(1000)  @title: '도메인'            @description: '해당 컬럼에 허용되는 값들의 집합';
        is_pk                   : Boolean       @title: 'PK여부'            @description: '기본키(Primary Key) 여부';
        is_fk                   : Boolean       @title: 'FK여부'            @description: '외래키(Foreign Key) 여부';
        ref_table_name          : String(128)   @title: '참조테이블명'      @description: '외래키인 경우 참조하는 테이블명';
        term_name               : String(200)   @title: '용어명'            @description: '용어의 이름';
        is_ai_target            : Boolean       @title: 'AI대상여부'        @description: 'AI 대상 컬럼';
        sample_data             : String(1000)  @title: '샘플데이터'        @description: '컬럼 샘플데이터';
        last_mod_dt             : Date          @title: '최종변경일'        @description: '최종 변경일';
        
    // 관계: 해당 컬럼이 속한 테이블
    table : Association to Table on table.name = $self.table_name;
    
    // 관계: 해당 컬럼과 연관된 용어
    // term : Association to Term on term.name = $self.term_name;
    
    // 관계: 외래키인 경우 참조하는 테이블
    // ref_table : Association to Table on ref_table.name = $self.ref_table_name;
}

/**
 * 메뉴 메타데이터
 */
entity Menu {
    key id                      : String(50)    @title: '메뉴ID'            @description: '메뉴 고유 식별자';
        name                    : String(128)   @title: '메뉴명'            @description: '메뉴 이름';
        type                    : String(50)    @title: '타입'              @description: '메뉴 분류 타입';
        description             : String(1000)  @title: '메뉴설명'          @description: '메뉴의 기능과 용도에 대한 설명';
        trigger_patterns        : String(1000)  @title: '트리거패턴'        @description: '메뉴 키워드 정보';
        route_template          : String(500)   @title: '라우트템플릿'      @description: 'URL 경로의 템플릿 패턴';
        availableItems          : String(50)    @title: '사용가능항목'      @description: '해당 메뉴에서 사용 가능한 item 파라미터 목록';
        is_use                  : Boolean       @title: '사용여부'          @description: '사용 여부';
        is_system               : Boolean       @title: '시스템여부'        @description: '시스템 메뉴 여부';
        last_mod_dt             : Date          @title: '최종변경일'        @description: '최종 변경일';
}