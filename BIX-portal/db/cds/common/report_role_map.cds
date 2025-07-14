using {
    cuid,
    managed
} from '@sap/cds/common';


namespace common;

entity report_role_map : cuid, managed {
    emp_no : String(10);
    ccorg_cd : String(10);  // 특정 부문이 아닌 전체인 경우 null 및 빈 값
    report_type : String(10);
}
