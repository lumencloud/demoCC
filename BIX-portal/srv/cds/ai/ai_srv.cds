using ai as ai_agent_view from '../../../db/cds/ai/view/ai_agent_view';
using ai as ai_agent_bau_view from '../../../db/cds/ai/view/ai_agent_bau_view';
using ai as ai from '../../../db/cds/ai/ai';

@impl    : 'srv/handlers/ai/ai_handler.js'
@path    : '/odata/v4/ai-api'
@requires: 'authenticated-user'

service AIService {
    // 마스터 에이전트 함수
    action   process_interaction(context : String) returns {
        taskId : String;
        status : String;
    };

    action   check_task_status(taskId : String)    returns {
        status   : String;
        progress : Integer;
        result   : String;
        error    : String;
    };

    entity ai_content                                                         as projection on ai.ai_content;
    entity ai_set                                                             as projection on ai.ai_set;
    entity ai_agent_view2(start_date : String(10), end_date : String(10))     as projection on ai_agent_view.ai_agent_view2(start_date : :start_date, end_date : :end_date);
    entity ai_agent_view3(start_date : String(10), end_date : String(10))     as projection on ai_agent_view.ai_agent_view3(start_date : :start_date, end_date : :end_date);
    entity ai_agent_view4(start_date : String(10), end_date : String(10))     as projection on ai_agent_view.ai_agent_view4(start_date : :start_date, end_date : :end_date);
    entity ai_agent_view5(start_date : String(10), end_date : String(10))     as projection on ai_agent_view.ai_agent_view5(start_date : :start_date, end_date : :end_date);
    entity ai_agent_view6(start_date : String(10), end_date : String(10))     as projection on ai_agent_view.ai_agent_view6(start_date : :start_date, end_date : :end_date);
    entity ai_agent_bau_view2(start_date : String(10), end_date : String(10)) as projection on ai_agent_bau_view.ai_agent_bau_view2(start_date : :start_date, end_date : :end_date);
    entity ai_agent_bau_view3(start_date : String(10), end_date : String(10)) as projection on ai_agent_bau_view.ai_agent_bau_view3(start_date : :start_date, end_date : :end_date);
    entity ai_agent_bau_view4(start_date : String(10), end_date : String(10)) as projection on ai_agent_bau_view.ai_agent_bau_view4(start_date : :start_date, end_date : :end_date);
    entity ai_agent_bau_view5(start_date : String(10), end_date : String(10)) as projection on ai_agent_bau_view.ai_agent_bau_view5(start_date : :start_date, end_date : :end_date);
    entity ai_agent_bau_view6(start_date : String(10), end_date : String(10)) as projection on ai_agent_bau_view.ai_agent_bau_view6(start_date : :start_date, end_date : :end_date);
    
    function get_ai_content(dashboard_id : UUID)   returns array of ai_dashboard_content;

    type ai_dashboard_content {
        dashboard_id : UUID;
        ID           : UUID;
        Parent_id    : UUID;
        title        : String(50);
        sub_title    : String(100);
        ui_seq       : Integer;
        widget_id    : String(50);
        column_width : Integer;
        children     : Map;
        page         : Integer;
    }
}
