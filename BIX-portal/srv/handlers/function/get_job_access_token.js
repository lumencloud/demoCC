/**
 * Job Scheduler Access Token
 */
const xsenv = require('@sap/xsenv');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');

module.exports = async function (req) {

    let accessToken;
    let jobServiceName = "bix-portal-job-scheduler";
    if (process.env.NODE_ENV !== 'production') {
        jobServiceName = "custom-service:bix-portal-job-scheduler"
    }
    const services = xsenv.getServices({ "jobscheduler": { "name": jobServiceName } });
    const auth = btoa(`${services.jobscheduler.uaa.clientid}:${services.jobscheduler.uaa.clientsecret}`);

    await executeHttpRequest(
        { url: `${services.jobscheduler.uaa.url}` },
        {
            method: 'post',
            url: '/oauth/token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${auth}`,
                'Cache-Control': 'no-cache'
            },
            data: 'grant_type=client_credentials'
        },
        {
            fetchCsrfToken: false
        }
    ).then(res => {
        accessToken = res.data?.access_token;
    }).catch(err => {
        console.log(err)
    });

    return { token: accessToken, service: services };
}