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
    name             : String(30);
    i18nTitle        : Association to one i18n;
    sort_order       : Integer;
    description      : String(200);
    iconSrc          : String(100);
    use_yn           : Boolean     @title: '사용여부';
    delete_yn        : Boolean     @title: '삭제여부';
    isApp            : String(30) enum {
        main;
        sub;
        none;
    };
    category         : String(20)  @title: '메뉴 상위 구분코드'   @description: '개발구조의 app/ 폴더 하위 <br/> url 경로의 첫번째 path';
    code             : String(20)  @title: '메뉴 상세 구분코드'   @description: '개발구조의 app/<category>/ 폴더 하위 <br/> url 경로의 두번째 path';
    page_path        : String(50)  @title: '실적/추정 구분 경로'  @description: '실적/추정PL 에서만 사용, 상세 경로1';
    detail_path      : String(50)  @title: '상세 페이지 경로'    @description: '실적/추정PL 에서만 사용, 상세 경로2';
    route            : String(20);
    pattern          : String(50);
    trigger_patterns : String(300);
    system_yn        : Boolean     @title: '시스템 사용여부';
    Parent           : Association to one menu;
    Child            : Composition of many menu
                           on Child.Parent = $self;
// Roles       : Composition of many RoleMenuMappings
//                   on Roles.menu = $self;
}
