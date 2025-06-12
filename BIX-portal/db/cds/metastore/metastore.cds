namespace metastore;

/**
 * 테이블 메타데이터
 */
entity Table {
    key bsn_div         : String(50)    @title: '업무구분'      @description: '대상 테이블 업무 구분';
    key name            : String(128)   @title: '테이블명'      @description: '테이블 이름';
        kor_name        : String(200)   @title: '테이블한글명'  @description: '테이블의 한글 이름 또는 별칭';
        description     : String(1000)  @title: '테이블설명'    @description: '테이블의 목적과 용도에 대한 설명';
        is_ai_tgt       : Boolean       @title: 'AI대상여부'    @description: 'AI 대상 테이블';
        related_sys     : String(50)    @title: '연관시스템'    @description: '테이블의 연관 시스템';
        last_mod_dt     : Date          @title: '최종변경일'    @description: '테이블 최종 변경일';
        
    // 관계: 해당 테이블의 컬럼들
    columns : Composition of many Column on columns.table_name = $self.name;
}

/**
 * 컬럼 메타데이터
 */
entity Column {
    key table_name      : String(128)   @title: '테이블명'      @description: '해당 컬럼이 속한 테이블 이름';
    key name            : String(128)   @title: '컬럼명'        @description: '컬럼의 물리적 이름';
        kor_name        : String(200)   @title: '컬럼한글명'    @description: '컬럼의 한글 이름 또는 별칭';
        description     : String(1000)  @title: '컬럼설명'      @description: '컬럼의 용도와 저장되는 데이터에 대한 설명';
        data_type       : String(50)    @title: '데이터타입'    @description: '컬럼의 데이터 타입(VARCHAR, INTEGER 등)';
        is_nullable     : Boolean       @title: 'NULL허용'      @description: 'NULL값 허용 여부';
        domain          : String(1000)  @title: '도메인'        @description: '해당 컬럼에 허용되는 값들의 집합';
        is_pk           : Boolean       @title: 'PK여부'        @description: '기본키(Primary Key) 여부';
        term_name       : String(200)   @title: '용어명'        @description: '용어의 이름';
        is_ai_tgt       : Boolean       @title: 'AI대상여부'    @description: 'AI 대상 컬럼';
        last_mod_dt     : Date          @title: '최종변경일'    @description: '컬럼 최종 변경일';
        
    // 관계: 해당 컬럼이 속한 테이블
    table : Association to Table on table.name = $self.table_name;
}