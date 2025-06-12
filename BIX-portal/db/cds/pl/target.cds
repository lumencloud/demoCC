using {managed} from '@sap/cds/common';
using {common.org as org} from '../common/org';

namespace pl;

/**
 * 연단위 목표 테이블
 */
entity target : managed {
    key year         : String(4)      @title: '대상 년도';
    key ccorg_cd     : String(8)      @title: '조직 코드';
        ccorg_detail : Association to org
                           on  ccorg_detail.ccorg_cd = $self.ccorg_cd
                           and ccorg_detail.use_yn   = true;
        sale         : Decimal(18, 2) @title: '목표 매출';
        margin       : Decimal(18, 2) @title: '목표 마진';
        br           : Decimal(5, 2)  @title: '목표 BR';
}
