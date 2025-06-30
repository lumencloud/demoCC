// srv/handlers/ai/config/paths.js
const path = require('path');

// 기본 디렉토리 경로
const BASE_DIR = path.resolve(__dirname, '..');
const MODELS_DIR = path.join(BASE_DIR, 'model');

module.exports = {
    // 모델 관련 경로
    MODELS_DIR,
    AGENT_LIST_PATH: path.join(MODELS_DIR, 'template/agent_list.json'),
    QUICK_ANSWER_AGENT_PATH: path.join(MODELS_DIR, 'template/quick_answer_agent.json'),
    NAVIGATOR_AGENT_PATH: path.join(MODELS_DIR, 'template/navigator_agent.json'),
    REPORT_AGENT_PATH: path.join(MODELS_DIR, 'template/report_agent.json'),
};