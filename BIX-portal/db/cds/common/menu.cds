namespace common;

using {
    cuid,
    managed
} from '@sap/cds/common';
using common.i18n as i18n from './i18n';

/**
 * 메뉴 테이블
 */
entity menu : cuid, managed {
    name        : String(30);
    i18nTitle   : Association to one i18n;
    sort_order  : Integer;
    description : String(200);
    iconSrc     : String(100);
    use_yn      : Boolean @title: '사용여부';
    delete_yn   : Boolean @title: '삭제여부';
    isApp       : String(30) enum {
        main;
        sub;
        none;
    };
    category    : String(20);
    code        : String(20);
    route       : String(20);
    pattern     : String(50);
    Parent      : Association to one menu;
    Child       : Composition of many menu
                      on Child.Parent = $self;
// Roles       : Composition of many RoleMenuMappings
//                   on Roles.menu = $self;
}
