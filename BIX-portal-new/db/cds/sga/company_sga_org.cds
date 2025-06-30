/**
 * 등록일 : 250415
 */

using {managed} from '@sap/cds/common';

namespace sga;

/**
 * SG&A 인건비
 */
entity company_sga_org : managed {
    key ccorg_cd        : String(8) not null  @title: '전사SG&A 조직 CC코드';
        name            : String(50)          @title: '조직 이름';
}
