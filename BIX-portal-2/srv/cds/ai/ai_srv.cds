@impl    : 'srv/handlers/ai/ai_handler.js'
@path    : '/odata/v4/ai-api'
@requires: 'any'

service AIService {
    // 마스터 에이전트 함수
    action process_interaction(context : String) returns {
        taskId : String;
        status : String;
    };
    
    action check_task_status(taskId : String) returns {
        status : String;
        progress : Integer;
        result : String;
        error : String;
    };
}
