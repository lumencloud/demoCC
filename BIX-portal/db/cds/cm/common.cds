namespace cm;

using {
    cuid,
    managed
} from '@sap/cds/common';

/**
 * 공통코드그룹
 */
entity CodesHeader : cuid, managed {
    category    : String(20);
    description : String(20);
    useFlag     : Boolean;
    codesItem   : Composition of many CodesItem
                    on codesItem.codesHeader = $self;
}

/**
 * 공통코드아이템
 */
entity CodesItem : cuid, managed {
    codesHeader : Association to one CodesHeader;
    name        : String(50);
    value       : String(20);
    datatype    : String(20);
    sortOrder   : Integer;
    useFlag     : Boolean;
}

/**
 * 메뉴 폴더구조
 */
entity Menus : cuid, managed {
    name        : String(30);
    i18nTitle   : Association to one I18nProperties;
    sortOrder   : Integer;
    description : String(200);
    iconSrc     : String(100);
    use_yn      : Boolean;
    isApp       : String(30) enum {
        main;
        sub;
        none;
    };
    category    : String(20);
    code        : String(20);
    route       : String(20);
    pattern     : String(50);
    Apps        : Association to many Apps
                      on Apps.Menus = $self;
    Parent      : Association to one Menus;
    Child       : Composition of many Menus
                      on Child.Parent = $self;
    Roles       : Composition of many RoleMenuMappings
                      on Roles.Menus = $self;
}

/**
 * 비즈니스 어플리케이션
 */
entity Apps : cuid, managed {
    name        : String(30);
    i18nTitle   : Association to one I18nProperties;
    sortOrder   : Integer;
    description : String(200);
    iconSrc     : String(100);
    useFlag     : Boolean;
    category    : String(20);
    code        : String(20);
    pattern     : String(50);
    Menus       : Association to one Menus;
    Roles       : Composition of many RoleAppMappings
                      on Roles.Apps = $self;
}

/**
 * 역할
 */
entity Roles : cuid, managed {
    name        : String(30);
    description : String(200);
    uesFlag     : Boolean;
    Menus       : Composition of many RoleMenuMappings
                      on Menus.Roles = $self;
    Apps        : Composition of many RoleAppMappings
                      on Apps.Roles = $self;
}

/**
 * 역할 - 메뉴 단위 매핑테이블
 */
entity RoleMenuMappings : cuid { // link table
    Menus : Association to Menus;
    Roles : Association to Roles;

}

/**
 * 역할 - 앱 단위 매핑테이블
 */
entity RoleAppMappings : cuid { // link table
    Apps  : Association to Apps;
    Roles : Association to Roles;
}

/**
 * 다국어 테이블 - 기본 ko 저장 / 각 언어코드별 localized 저장
 */
entity I18nProperties : managed {
    key i18nKey  : String(50);
        i18nText : localized String(500);
        type     : String(30) enum {
            Text;
            Msg;
        };
        category : String(20);
}
