using {managed} from '@sap/cds/common';

namespace common;

/**
 * 연단위 공통 목표 테이블
 * common_code_header > target_code
 * common_codecode_item >
 * name / value / value_opt1
 * A01 / 매출 / 01
 * A02 / 마진율 / 02
 * A03 / 마진 / 01
 * A04 / 공헌이익 / 01
 * A05 / BR(MM) / 02
 * A06 / RoHC / 01
 * A07 / BR (Cost) / 02
 * B01 / Offshoring / 01
 * B02 / DT매출 / 01
 * B03 / DT마진 / 01
 * B04 / Non-MM / 01
 * C01 / SG&A / 01
 * C02 / 영업이익 / 01
 * C03 / 전사영업이익 / 01
 * C04 / 총액 인건비 / 01
 * C05 / 인건비 / 01
 * C06 / 투자비 / 01
 * C07 / 경비 / 01
 * C08 / 전사SG&A / 01
 *
 * 01 금액 / 02 퍼센트
 */
entity target : managed {
    key year          : String(4)      @title: '대상 년도';
    key ccorg_cd      : String(8)      @title: 'ERP Cost Center';
    key target_cd     : String(8)      @title: '목표 코드';
        target_val    : Decimal(18, 2) @title: '목표값';
        is_total_calc : Boolean        @title: '전사기준 집계여부';
};

/**
 * 연단위 공통 목표 테이블
 */
entity annual_target : managed {
    key year           : String(4)      @title: '대상 년도';
    key target_type    : String(20)     @title: '목표 대상 (ccorg_cd / dgtr_task_cd / biz_tp_account_cd ...)';
    key target_type_cd : String(50)     @title: '목표 대상의 코드';
    key target_cd      : String(8)      @title: '목표 코드';
        target_val     : Decimal(18, 2) @title: '목표값';
        is_total_calc  : Boolean        @title: '전사기준 집계여부';
};