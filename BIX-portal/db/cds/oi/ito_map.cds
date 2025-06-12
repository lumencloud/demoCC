using {managed} from '@sap/cds/common';

namespace oi;

/**
 * 외주비 구분 맵핑 테이블
 */
entity ito_map : managed {
    key vendor_cd  : String(10) @title: '업체코드';
        vendor_nm  : String(40) @title: '업체명';
        ito_type   : String(10) @title: '외주비 구분' @description: 'K-BP / ATS / AGS / (AI) 애커튼은 우선 제외';
        ito_off_yn : String(1)  @title: 'offshoring 구분자' @description: 'offshoring 구분자 = "X"';
}
