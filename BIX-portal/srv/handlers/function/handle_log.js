const util = require("util");

/**
 * 로그 관리
 * @returns 
 */
module.exports = (srv) => {
    // 오류 발생 시
    srv.on("error", (err, req) => {
        // 이벤트명 (CREATE, UPDATE, DELETE)
        let event = req.event;

        // 가능한 레벨
        const _levels = ["SILENT", "ERROR", "WARN", "INFO", "DEBUG", "TRACE"];
        const _colors = {
            reset: '\x1b[0m',
            red: '\x1b[31m',
            yellow: '\x1b[33m',
            green: '\x1b[32m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
        };       

        // 로그 포맷 설정
        let log = cds.log(event, { level: 'info' }).setFormat((id, ...args) => {
            // 예외처리
            if (!args[2]?.userId) return;

            let level = _levels[args[0]];
            let event = args[1];
            let oArgs = args[2];

            // 로그 설정
            let aLog = [
                `[${(new Date).toISOString()}]`,
                `[${_colors.red}${level}${_colors.reset}]`,
                `[${event || "-"}]`,
                `[${oArgs?.userId || "-"}]`,
                `[${oArgs?.userName || "-"}]`,
                `[${oArgs?.path || "-"}]`,
            ]

            // 메시지 추가
            aLog.push(`\nMessage: ${_colors.red}${oArgs?.message || "-"}${_colors.reset}`);

            // Create 및 Update 시 body 객체 추가
            if ((event === "CREATE" || event === "UPDATE") && oArgs.results) {
                aLog.push(`\nObject: ${util.inspect(oArgs.results, {colors: true, depth: null})}`);
            }

            return aLog;
        });

        // 로그에서 사용할 파라미터
        let sOriginalUrl = req.req?.originalUrl;
        let sUserId = req.user.id;
        let sUserName = req.user?.attr?.familyName + " " + req.user?.attr?.givenName;
        let oResult = req.req?.body;
        let sPath = req.target?._service?.["@path"] + sOriginalUrl;
        let sMessage = err.message;

        // 로그 실행
        log._error && log.error(event, {
            path: sPath,
            userId: sUserId,
            userName : sUserName,
            results: oResult,
            message: sMessage,
        })
    })

    // Create, Update, Delete 성공 시
    srv.after(["CREATE", "UPDATE", "DELETE"], '*', async (req, res) => {
        // 이벤트명 (CREATE, UPDATE, DELETE)
        let event = res.event;

        // 가능한 레벨
        const _levels = ["SILENT", "ERROR", "WARN", "INFO", "DEBUG", "TRACE"];
        const _colors = {
            reset: '\x1b[0m',
            red: '\x1b[31m',
            yellow: '\x1b[33m',
            green: '\x1b[32m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
        };       

        // 로그 포맷 설정
        let log = cds.log(event, { level: 'info' }).setFormat((id, ...args) => {
            // 예외처리
            if (!args[2].userId) return;

            let level = _levels[args[0]];
            let event = args[1];
            let oArgs = args[2];

            // 로그 설정
            let aLog = [
                `[${(new Date).toISOString()}]`,
                `[${_colors.green}${level}${_colors.reset}]`,
                `[${event || "-"}]`,
                `[${oArgs?.userId || "-"}]`,
                `[${oArgs?.userName || "-"}]`,
                `[${oArgs?.path || "-"}]`,
            ]

            if (event === "CREATE" || event === "UPDATE") {
                aLog.push(`\nObject: ${util.inspect(oArgs?.results, {colors: true, depth: null})}`);
            }

            return aLog;
        });

        // 로그에서 사용할 파라미터
        let sOriginalUrl = res.req?.originalUrl;
        let sUserId = res.user.id;
        let sUserName = res.user?.attr?.familyName + " " + res.user?.attr?.givenName;
        let oResult = res.results;
        let sPath = res.target?._service?.["@path"] + sOriginalUrl;

        // 로그 실행
        log._info && log.info(event, {
            path: sPath,
            userId: sUserId,
            userName: sUserName,
            results: oResult,
        })
    });
}