using {
    cuid,
    managed
} from '@sap/cds/common';

namespace dashboard;

using common.dashboard_target as dashboard_target from './dashboard_target';
using common.dashboard_content as dashboard_content from './dashboard_content';
entity dashboard_set : cuid, managed { // DashBoard 테이블
        parent_id    : String(50);
        name         : String(50) not null; // 메뉴의 이름 (Works, Collaboration, Process 등)
        type         : String(50); //all, group, user
        ui_seq        : Integer;
        use_flag      : Boolean default true;
        content      : Composition of many dashboard_content // 라운드
                           on content.dashboard = $self;
        target       : Composition of many dashboard_target
                           on target.dashboard = $self;
};

entity Code { // service의 기준 정보 관리에 코드 관리의 데이터를 위한 테이블
    key code     : String(50); //코드
        name     : localized String(100); //코드명
        colorSeq : Integer; // 색상
        use      : String(100); //사용 위치
        regUser  : String(100)  @cds.on.insert: $user;
        regDate  : DateTime     @cds.on.insert: $now; //생성일
        modUser  : String(100)  @cds.on.insert: $user  @cds.on.update: $user;
        modDate  : DateTime     @cds.on.insert: $now   @cds.on.update: $now; //수정일
};

view GetCode as
    select from Code as code 
    {
        code.code,
        code.localized.name,
        code.texts,
        code.colorSeq,
        code.use
    }
    order by
        code asc;

entity Menu { // Menu 테이블
    key seq          : String(50);
        parentSeq    : String(50);
        name         : String(50) not null; // 메뉴의 이름 (Works, Collaboration, Process 등)
        type         : String(50); //all, group, user
        uiSeq        : Integer;
        useFlag      : Boolean default true;
        acceptedFlag : String(50) default 'B'; //신청(A), 승인(B), 반려(C)
        content      : Composition of many Content // 라운드
                           on content.menu = $self;
        target       : Composition of many MenuTarget
                           on target.menu = $self;
        regUser      : String(100)  @cds.on.insert: $user;
        regDate      : DateTime     @cds.on.insert: $now;
        modUser      : String(100)  @cds.on.insert: $user  @cds.on.update: $user;
        modDate      : DateTime     @cds.on.insert: $now   @cds.on.update: $now;
};

entity Content {
    key menu        : Association to Menu;
    key seq         : String(50);
        parentSeq   : String(50);
        title       : String(50);
        subTitle    : String(100);
        uiSeq       : Integer;
        widgetSeq   : String(50);
        columnWidth : Integer;
}

entity MenuTarget {
    key menu      : Association to Menu;
    key targetSeq : String(50); //target seq
}

@cds.autoexpose
entity Card {
    key seq           : String(50);
        category      : String(50) not null;
        useFlag       : Boolean;
        title         : localized String(100);
        name          : String(100) not null;
        description   : String(2000); //info
        contentsType  : String(50);
        cardComponent : String(50);
        richText      : LargeString;
        cardFolder    : String(100);
        bannerType    : String(50);
        bannerTime    : Integer;
        target        : Composition of many CardTarget
                            on target.card = $self;
        image         : Composition of many CardImage //dms file id 저장
                            on image.card = $self;
        regUser       : String(100)  @cds.on.insert: $user;
        regDate       : DateTime     @cds.on.insert: $now;
        modUser       : String(100)  @cds.on.insert: $user  @cds.on.update: $user;
        modDate       : DateTime     @cds.on.insert: $now   @cds.on.update: $now;
}

entity CardTarget {
    key card      : Association to Card;
    key targetSeq : String(50);
}


entity CardImage {
    key card         : Association to Card;
    key dmsFileId    : String(50);
        actionType   : String(50);
        dmsFileIdSet : String(50);
}

view GetGroupMenuDetail as
    select from Menu as menu
    join MenuTarget as target
        on target.menu.seq = menu.seq
    left outer join Menu as parentmenu
        on parentmenu.seq = menu.parentSeq
    left outer join Menu as childmenu
        on childmenu.parentSeq = menu.seq
    {
        key menu.seq,
            menu.parentSeq,
            parentmenu.name as parentName,
            menu.name,
            menu.useFlag,
            menu.acceptedFlag,
            menu.regDate,
            menu.regUser,
            menu.modDate,
            childmenu.seq   as childSeq
    };

view GetMenuTarget as
    select from MenuTarget as target
    join Menu as menu
        on menu.seq = target.menu.seq
    {
        key target.targetSeq,
        key menu.seq,
            menu.type
    }

view GetMenuContent as
    select from Content as content
    join Menu as menu
        on menu.seq = content.menu.seq
    left outer join Card as Card
        on Card.seq = content.widgetSeq
    left outer join Menu as Menu
        on Menu.seq = content.widgetSeq
    {
        key content.menu.seq as menuSeq,
        key content.seq,
            content.parentSeq,
            content.title,
            content.subTitle,
            content.uiSeq,
            content.widgetSeq,
            content.columnWidth
    }
    where
        (
                content.widgetSeq is not null
            and Card.useFlag      =      true
        )
        or (
                content.widgetSeq is not null
            and Menu.seq          is not null
        )
        or content.widgetSeq is null
    order by
        content.uiSeq;

view GetAllCardList as
    select from (
        select from Card as card
        join CardTarget as cardtarget
            on cardtarget.card.seq = card.seq
        distinct {
            card.seq,
            card.category,
            // card.subCategory,
            card.localized.title,
            card.name,
            card.description,
            card.contentsType,
            card.cardComponent,
            card.cardFolder,
            card.bannerType,
            card.bannerTime,
            card.useFlag,
            card.regDate,
            card.regUser,
            card.modDate,
            card.modUser,
            cardtarget.targetSeq
        }
    ) as cardDistinct
    join Card as cardRich
        on cardDistinct.seq = cardRich.seq
    {
        key cardDistinct.seq,
            cardDistinct.category,
            // cardDistinct.subCategory,
            cardDistinct.title,
            cardDistinct.name,
            cardDistinct.description,
            cardDistinct.contentsType,
            cardDistinct.cardComponent,
            cardDistinct.cardFolder,
            cardDistinct.bannerType,
            cardDistinct.bannerTime,
            cardDistinct.useFlag,
            cardDistinct.regDate,
            cardDistinct.regUser,
            cardDistinct.modDate,
            cardDistinct.modUser,
            cardDistinct.targetSeq,
            cardRich.richText,
            cardRich.image
    };

view GetGroupMenuAll as
    select from Menu as menu
    join MenuTarget as target
        on target.menu.seq = menu.seq
    // left outer join user.User as user
    //     on menu.regUser = user.id
    //     and user.useFlag = true
    {
        key menu.seq,
            menu.parentSeq,
            menu.name,
            menu.useFlag,
            menu.acceptedFlag,
            menu.regDate,
            menu.regUser,
            // user.lastName || user.firstName as regName:String,
            menu.modDate
    }
    where
        menu.type = 'all'
    order by
        menu.type,
        menu.regDate;

view GetGroupMenuGroup as
    select from Menu as menu
    left outer join MenuTarget as target
        on target.menu.seq = menu.seq
    // left outer join user.User as user
    //       on menu.regUser = user.id
    //         and user.useFlag = true
    distinct {
        key menu.seq,
            menu.parentSeq,
            menu.name,
            menu.useFlag,
            menu.target,
            menu.acceptedFlag,
            menu.regDate,
            menu.regUser,
            // user.lastName || user.firstName as regName:String,
            menu.modDate
    }
    where
            menu.type != 'user'
        and menu.type != 'all'
    order by
        menu.regDate;

view GetMyWorkCheck as
    select from MyWorkCheck as check {
        key check.check,
            check.checkValue,
            check.modDate
    }
    where
        check = 1;

entity MyWorkCheck {
    key check      : Integer;
        checkValue : Boolean;
        modDate    : DateTime  @cds.on.insert: $now  @cds.on.update: $now;
}

view GetMenuView as
    select from Menu_ as menu
    left outer join Menu_ as parentmenu
        on parentmenu.seq = menu.parentSeq
    {
        key menu.seq,
            menu.parentSeq,
            parentmenu.localized.name as parentName,
            menu.title,
            menu.odataPath,
            menu.localized.name,
            menu.uiSeq,
            menu.iconSrc,
            menu.uriPattern,
            menu.folderSrc,
            menu.appId,
            menu.menuType,
            menu.description,
            menu.modDate,
    };

entity Menu_ { // Menu 테이블
    key seq         : String(50);
        parentSeq   : String(50);
        title       : String(100) not null;
        name        : localized String(100); // 메뉴의 이름 (Works, Collaboration, Process 등)
        odataPath   : String(50);
        uiSeq       : Integer not null;
        uriPattern  : String(50);
        iconSrc     : String(100);
        folderSrc   : String(200);
        appId       : String(50);
        menuType    : String(50);
        description : String(2000);
        // oData : Composition of many oData
        //             on oData.menu = $self;
        regUser     : String(100)  @cds.on.insert: $user;
        regDate     : DateTime     @cds.on.insert: $now;
        modUser     : String(100)  @cds.on.insert: $user  @cds.on.update: $user;
        modDate     : DateTime     @cds.on.insert: $now   @cds.on.update: $now;
}


// entity dashboard : cuid, managed {
//     sort_order  : Integer not null @title: '정렬 순서';
//     title       : String(50);
//     subTitle    : String(50);
//     columnWidth : Integer;
//     parent_id   : UUID;
//     parent      : Association to one dashboard
//                       on parent.ID = $self.parent_id;
//     children    : Association to many dashboard
//                       on children.parent = $self;

// }
