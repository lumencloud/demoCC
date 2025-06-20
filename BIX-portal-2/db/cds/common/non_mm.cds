using {
    cuid,
    managed
} from '@sap/cds/common';

namespace common;
entity non_mm : cuid, managed {
    key name               : String(100) @title: 'Non-mm 대표 조직 코드(cc_code)';
    key master_ccorg_cd    : String(20)  @title: 'Non-mm 대표 조직 코드(cc_code)';
        description        : String(200);
        year               : String(4);
        prj_nm             : String(300) @title: '프로젝트 명';
        prj_nm_op          : String(10);
        rodr_ccorg_cd      : String(20)  @title: '수주 조직 코드(cc_code)';
        rodr_ccorg_cd_op   : String(10);
        sale_ccorg_cd      : String(20)  @title: '매출 조직 코드(cc_code)';
        sale_ccorg_cd_op   : String(10);
        prj_prfm_str_dt    : Date        @title: '사업수행 시작일자';
        prj_prfm_str_dt_op : String(10);
        bd_n2_cd           : String(20)  @title: '비즈니스도메인 2';
        bd_n2_cd_op        : String(10);
        dgtr_task_cd       : String(30)  @title: 'DT 과제 코드';
        dgtr_task_cd_op    : String(10);
        cstco_cd           : String(20)  @title: '고객사 코드(ERP)';
        cstco_cd_op        : String(10);
        prj_tp_cd          : String(20)  @title: '프로젝트 유형 코드';
        prj_tp_cd_op       : String(10);
        itsm_div_yn        : Boolean     @title: 'ITSM 여부';
        itsm_div_yn_op     : String(10);
}

// 수주조직(Hi-Tech사업부문) & 수행시작일(‘25년~) & BD2(SI-장비) & DT여부(N) & PJT명(물류자동화)

// wildview의  프로젝트 번호로 프로젝트 table Joing 해야함
// "수주조직은 HI-TECH 사업부문 산하에 있는  Costcenter
// 수행시작일자 >=20250101 "
// "비즈니스도메인2  = SI-장비(코드명은 뭔지 잘…)
// DT과제코드 = Null
// 프로젝트명에 ""물류자동화"" 포함"


// 수주조직(제조/Global사업부문) & 수행시작일(‘25년~) & BD2(SI-장비) & Account(SKOn 제외) & DT여부(N)

// wildview의  프로젝트 번호로 프로젝트 table Joing 해야함
// "수주조직은 제조/Global사업부문 산하에 있는  Costcenter
// 수행시작일자 >=20250101 "
// "비즈니스도메인2  = "" SI-장비(코드명은 뭔지 잘…)""
// DT과제코드 = Null "
// "고객사코드는 SKO (ERP에서 SKO 본사 및 SKO해외법인 고객코드 업데이트 아래 화면 참고
// ( 변동 가능성이 있는데 유지보수 관점에서 Table 로 빼주면 좋겠음/ 예외고객사코드 처리 등으로..)"


// 매출귀속(Cloud부문) & BD2(Cloud-MRR) & PJT Type(OS운영 제외)

// wildview의  프로젝트 번호로 프로젝트 table Joing 해야함
// 수주조직은 Cloud 부문이면서 4개 본부(Cloud platform , Cloud 사업본부, Hybrid Cloud1,2본부)
// 비지니스도메인2 ="Cloud-MRR "
// PJT Type은 OS운영 제외하고  (코드값은 참고) & ITSM여부 필드값이 Y가 아님
