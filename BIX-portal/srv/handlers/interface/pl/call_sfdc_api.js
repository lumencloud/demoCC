// const cds = require('@sap/cds');
const { func } = require('@sap/cds/lib/ql/cds-ql');

// module.exports = class PLInterfaceService extends cds.ApplicationService {

module.exports = (srv) => {
    srv.on('call_sfdc_api', async (req) => {

        const PLInterfaceService = await cds.connect.to('PLInterfaceService');

        const db = await cds.connect.to('db');
        const tx = cds.tx(req);
        const version_sfdc = db.entities('common').version_sfdc;

        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth()).toString().padStart(2, '0'); // 인터페이스 시점 직전 월

        const temp = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = temp.getUTCDay() || 7; // 일요일은 7로 처리

        temp.setUTCDate(temp.getUTCDate() + 4 - dayNum); // 해당 주의 목요일로 이동
        const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
        const week = Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);


        try {
            const ver_info = await SELECT.one.from(version_sfdc)
                .where({ year: year, month: month })
                .orderBy('ver desc');

            let ver_no = `D${year}${month}01`
            if (ver_info) {
                ver_no = ver_info.ver.substring(0, 7) + (Number(ver_info.ver.slice(7)) + 1).toString().padStart(2, '0');
            }

            await tx.run(INSERT([{
                if_id: func('SYSUUID')[0], ver: ver_no, year: year, month: month, week: week, tag: 'C'
            }]).into(version_sfdc));

            const [
                call_if_sfdc
            ] = await Promise.all([
                await PLInterfaceService.call_if_sfdc()

            ])

            return [
                call_if_sfdc
            ]

        } catch (e) {
            console.log(e);
            return { error: e.message };
        }
    })
}