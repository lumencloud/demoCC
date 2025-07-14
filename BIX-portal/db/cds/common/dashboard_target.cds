using dashboard.dashboard_set as dashboard_set from './dashboard';

namespace common;

entity dashboard_target {
    key dashboard  : Association to dashboard_set;
    key target_seq : String(50);
}
