const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const get_job_access_token = require('../function/get_job_access_token');

module.exports = (srv) => {
    srv.on('get_job_list', async (req) => {

        let result;
        const jobInfo = await get_job_access_token();
        const accessToken = jobInfo.token;
        const jobService = jobInfo.service;

        await executeHttpRequest(
            { url: `${jobService.jobscheduler?.url}` },
            {
                method: 'get',
                url: '/scheduler/jobs',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Cache-Control': 'no-cache'
                }
            },
            {
                fetchCsrfToken: false
            }
        ).then(res => {
            result = res.data.results;
        }).catch(err => {
            console.log(err)
        });

        return result;
    });
}