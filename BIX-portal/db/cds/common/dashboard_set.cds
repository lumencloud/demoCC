using {
    cuid,
    managed
} from '@sap/cds/common';

namespace common;

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