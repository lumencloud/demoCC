using {
    cuid,
    managed
} from '@sap/cds/common';
using dashboard.dashboard_set as dashboard_set from './dashboard';

namespace common;

entity dashboard_content : cuid, managed {
        dashboard    : Association to one dashboard_set;
        Parent       : Association to one dashboard_content;
        Child        : Composition of many dashboard_content
                           on Child.Parent = $self;
        title        : String(50);
        sub_title    : String(100);
        ui_seq       : Integer;
        widget_id    : String(50);
        column_width : Integer;
}
