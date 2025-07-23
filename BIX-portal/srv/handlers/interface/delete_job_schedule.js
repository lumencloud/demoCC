const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const get_job_access_token = require('../function/get_job_access_token');

module.exports = (srv) => {
    srv.on('delete_job_schedule', async (req) => {

        const { jobId, scheduleId } = req.data;

        let result;

        const jobInfo = await get_job_access_token();
        const accessToken = jobInfo.token;
        const jobService = jobInfo.service;

        await executeHttpRequest(
            { url: `${jobService.jobscheduler?.url}` },
            {
                method: 'delete',
                url: `/scheduler/jobs/${jobId}/schedules/${scheduleId}`,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Cache-Control': 'no-cache'
                }
            },
            {
                fetchCsrfToken: false
            }
        ).then(res => {
            result = res;
        }).catch(err => {
            console.log(err)
        });

        return result;
    });
}