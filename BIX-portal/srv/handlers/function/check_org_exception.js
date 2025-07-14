/**
 * 데이터 반환 전 조직에 대한 예외처리 (Ex: Ackerton Partners)
 */
module.exports = async function (aResult, org_level) {
    // 1. org_level이 lv1 및 lv2일 때, div_ccorg_cd를 기준으로 Ackerton Partners 합치기
    if (org_level === "lv1" || org_level === "lv2") {
        // Ackerton Partners 조직 정보 반환
        const db = await cds.connect.to('db');
        const org_full_level = db.entities('common').org_full_level_view;
        let oAckertonInfo = await SELECT.one.from(org_full_level).where({ 'org_ccorg_cd': '610000' });

        for (let i = aResult.length - 1; i >= 0; i--) {
            if (aResult[i].div_ccorg_cd === "610000") {
                
            }
        }
    }
}