const { func } = require('@sap/cds/lib/ql/cds-ql');

module.exports = (srv) => {
    srv.on('call_sfdc_interface_api', async (req) => {

        const PLInterfaceService = await cds.connect.to('PLInterfaceService');
        const CommonInterfaceService = await cds.connect.to('CommonInterfaceService');

        const db = await cds.connect.to('db');
        const tx = cds.tx();
        const tx2 = cds.tx(req);
        const common_version_sfdc = db.entities('common').version_sfdc;

        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth()).toString().padStart(2, '0'); // 인터페이스 시점 직전 월

        const temp = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = temp.getUTCDay() || 7; // 일요일은 7로 처리

        temp.setUTCDate(temp.getUTCDate() + 4 - dayNum); // 해당 주의 목요일로 이동
        const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
        const week = Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);

        try {
            // [step-1 버전코드 생성]
            // 이번 달 최신 버전정보 조회
            const ver_info = await SELECT.one.from(common_version_sfdc)
                .where({ year: year, month: month })
                .orderBy('ver desc');

            let ver_no = `D${year}${month}01`
            // 이번 달 최신 버전이 존재 할 경우, [최신 버전 + 1] 신규 버전코드 생성
            if (ver_info) {
                ver_no = ver_info.ver.substring(0, 7) + (Number(ver_info.ver.slice(7)) + 1).toString().padStart(2, '0');
            }

            // [step-2 신규 버전코드 등록]
            await INSERT([{
                if_id: func('SYSUUID')[0], ver: ver_no, year: year, month: month, week: week, tag: 'C'
            }]).into(common_version_sfdc);
            
            await tx.commit();

            // [step-3 인터페이스 실행]
            const [ call_if_sfdc ] = await Promise.all([
                // sfdc 인터페이스 프로시저 호출 api 실행
                // temp (아직 sfdc > if 로직 미구현 / if > db 만 동작)
                await PLInterfaceService.call_if_sfdc()
            ]);

            // [step-4 인터페이스 수행결과 체크 / 성공시 tag (S/C) 업데이트]
            if(!call_if_sfdc.error && call_if_sfdc.O_RESULT[0].ERROR_TYPE === "FINISH" ) {
                
                // // 올해 인터페이스 기존 버전 tag - 'C' 업데이트
                // await tx2.run(UPDATE(common_version_sfdc).set({tag : 'C'}).where({tag : 'F', year : year}));
                // // 인터페이스 신규 버전 tag - 'F' 업데이트
                // await tx2.run(UPDATE(common_version_sfdc).set({tag : 'F'}).where({ver : ver_no}));
            }

            // [step-5 인터페이스 api 종료]
            return [ call_if_sfdc ];

        } catch (e) {
            console.log(e);
            return { error: e.message };
        }
    })
}
