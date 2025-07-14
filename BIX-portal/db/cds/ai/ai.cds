using {
    cuid,
    managed
} from '@sap/cds/common';

namespace ai;

entity ai_content : cuid, managed {
    dashboard    : Association to one ai_set;
    Parent       : Association to one ai_content;
    Child        : Composition of many ai_content
                       on Child.Parent = $self;
    title        : String(50);
    sub_title    : String(100);
    ui_seq       : Integer;
    widget_id    : String(50);
    column_width : Integer;
    page         : Integer;        // 페이징 순서
}

entity ai_set : cuid, managed { // DashBoard 테이블
    parent_id : String(50);
    name      : String(50) not null; // 메뉴의 이름 (Works, Collaboration, Process 등)
    type      : String(50); //all, group, user
    ui_seq    : Integer;
    content   : Composition of many ai_content // 라운드
                    on content.dashboard = $self;
};
