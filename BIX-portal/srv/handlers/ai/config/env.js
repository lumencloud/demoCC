/**
 * AI Core 환경 설정
 */

// 모드 설정(dev, stag, prod)
const env = process.env.NODE_ENV || 'dev';

// 기본 설정
const config = {
    // API 설정
    AI_API_URL: process.env.SAP_AI_API_URL || 'https://api.ai.prod.ap-northeast-1.aws.ml.hana.ondemand.com',
    DEPLOYMENT_ID: process.env.SAP_AI_DEPLOYMENT_ID || 'dd33a29a406758e1',
    TOKEN_URL: process.env.SAP_AI_TOKEN_URL || 'https://ai-skerp1.authentication.jp10.hana.ondemand.com/oauth/token',
    
    // 인증 설정
    CLIENT_ID: process.env.SAP_AI_CLIENT_ID || 'sb-1e1765d3-0f79-4890-8fc8-46cab70cdb51!b24275|aicore!b44',
    CLIENT_SECRET: process.env.SAP_AI_CLIENT_SECRET || '43a6e8d2-5ecf-4a99-978b-4b58dde60ab8$ypVGwjmJ2RbqyRkov-IAb1OuA1UaNB5ma78T9o3M3Jc=',
    
    // 기본 설정
    REQUEST_TIMEOUT: 30000,
    VECTOR_DIMENSIONS: 3,
    USE_REAL_EMBEDDING: false
};

// 필수 설정 체크
const isValid = !!(config.CLIENT_ID && config.CLIENT_SECRET);

// 간단한 로그
console.log(`AI Config (${env}):`, {
    API_URL: config.AI_API_URL,
    DEPLOYMENT_ID: config.DEPLOYMENT_ID,
    CLIENT_ID: config.CLIENT_ID ? '***설정됨***' : '❌누락됨',
    CLIENT_SECRET: config.CLIENT_SECRET ? '***설정됨***' : '❌누락됨',
    VALID: isValid ? '✅' : '❌'
});

module.exports = {
    ...config,
    isValid
};