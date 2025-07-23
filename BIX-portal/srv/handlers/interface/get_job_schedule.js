const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const get_job_access_token = require('../function/get_job_access_token');

module.exports = (srv) => {
    srv.on('get_job_schedule', async (req) => {

        const { jobId } = req.data;

        let jobs, result = [];

        const jobInfo = await get_job_access_token();
        const accessToken = jobInfo.token;
        const jobService = jobInfo.service;

        const getSchedule = async (_jobId) => {
            await executeHttpRequest(
                { url: `${jobService.jobscheduler?.url}` },
                {
                    method: 'get',
                    url: `/scheduler/jobs/${_jobId}/schedules`,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Cache-Control': 'no-cache'
                    }
                },
                {
                    fetchCsrfToken: true
                }
            ).then(res => {
                let schedules = res.data.results;
                /**
                 * jobId 응답 정보 추가
                 */
                for (const schedule of schedules) {
                    schedule['jobId'] = _jobId;
                }
                result.push(schedules);
            }).catch(err => {
                console.log(err?.message)
                if (err.status === 404) {
                    req.reject(404, err?.message);
                } else {
                    result = err?.message;
                }
            });
        }

        if (!jobId) {
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
                jobs = res.data.results;
            }).catch(err => {
                console.log(err)
            });

            for (const job of jobs) {
                await getSchedule(job.jobId);
            };
        } else {
            await getSchedule(jobId);
        }

        return result;
    });
}