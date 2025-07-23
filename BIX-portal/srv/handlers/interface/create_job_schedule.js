const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const get_job_access_token = require('../function/get_job_access_token');

module.exports = (srv) => {
    srv.on('get_job_schedule', async (req) => {

        let result;
        try {
            const { schedule } = req.data;
            if (!schedule) throw error("입력값 없음");
            if (!schedule.active) schedule.active = false

            const jobId = schedule.jobId;
            const scheduleId = schedule.scheduleId;

            if (!jobId || !scheduleId || jobId === '' || !scheduleId === '') throw error("필수값 누락");

            const jobInfo = await get_job_access_token();
            const accessToken = jobInfo.token;
            const jobService = jobInfo.service;

            await executeHttpRequest(
                { url: `${jobService.jobscheduler?.url}` },
                {
                    method: 'post',
                    url: `/scheduler/jobs/${jobId}/schedules`,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Cache-Control': 'no-cache'
                    },
                    data: schedule
                },
                {
                    fetchCsrfToken: true
                }
            ).then(res => {
                result = res.data.results;
            }).catch(err => {
                console.log(err);
                result = err.toString();
            });

        } catch (e) {
            console.log(e);
            result = e.toString();
        }

        return result;
    });
}