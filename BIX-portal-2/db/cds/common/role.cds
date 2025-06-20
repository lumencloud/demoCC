namespace common;

using {
    cuid,
    managed
} from '@sap/cds/common';
using common.menu as menu from './menu';

/**
 * 역할
 */
entity role : cuid, managed {
    name        : String(30);
    description : String(200);
    use_yn      : Boolean;
    Menus       : Composition of many RoleMenuMappings
                      on Menus.Roles = $self;
}

/**
 * 역할 - 메뉴 단위 매핑테이블
 */
entity RoleMenuMappings : cuid { // link table
    Menus : Association to menu;
    Roles : Association to role;
}
