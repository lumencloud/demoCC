sap.ui.define([

], function () {
    "use strict";

    let Formatter = {};


    //X:공
    //O:hacc kmx
    Formatter.numberFormat = function (number) {
        let iNumber = parseFloat(number);
        if (isNaN(iNumber)) {
            return ''
        }
        return iNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    //X:공 hacc
    //O:kmx
    Formatter.numberFormat3 = function (number) {
        let iNumber = parseFloat(number);
        if (isNaN(iNumber)) {
            return ''
        }
        return iNumber.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };
    //YYYY-MM-DDTHH:MM:SSZ => YYYY-MM-DD
    Formatter.commonDate2 = function (data) {
        if (data != undefined) {
            let year, month, date;
            let sDate = new Date(data);
            year = sDate.getFullYear()
            month = sDate.getMonth() + 1;
            date = sDate.getDate();

            month = month >= 10 ? month : '0' + month;
            date = date >= 10 ? date : '0' + date;

            let sResult = year + "-" + month + "-" + date;
            return sResult;
        } else {
            return "-"
        }
    }

    //YYYY-MM-DDTHH:MM:SSZ => YYYY-MM-DD
    Formatter.commonDate21 = function (data) {
        if (data != undefined) {
            let year, month, date;
            let sDate = new Date(data);
            year = sDate.getFullYear()
            month = sDate.getMonth() + 1;
            date = sDate.getDate();

            month = month >= 10 ? month : '0' + month;
            date = date >= 10 ? date : '0' + date;

            let sResult = year + "" + month + "" + date;
            return sResult;
        } else {
            return "-"
        }
    }

    //YYYY-MM-DDTHH:MM:SSZ => DD.MM.YYYY HH:MM
    Formatter.commonDate3 = function (data) {
        if (data != undefined) {
            let sDate = new Date(data);
            let year, month, date, hours, minutes;
            year = sDate.getFullYear()
            month = sDate.getMonth() + 1;
            date = sDate.getDate();
            hours = sDate.getHours();
            minutes = sDate.getMinutes();

            month = month >= 10 ? month : '0' + month;
            date = date >= 10 ? date : '0' + date;
            hours = hours >= 10 ? hours : '0' + hours;
            minutes = minutes >= 10 ? minutes : '0' + minutes;

            let sResult = year + "-" + month + "-" + date + " " + hours + ":" + minutes;
            return sResult;
        } else {
            return "-"
        }
    }
    //YYYY-MM-DDTHH:MM:SSZ =>YYYY.MM.DD HH:MM:SS
    Formatter.commonDate4 = function (data) {
        if (data != undefined) {
            let sDate = new Date(data);
            let year, month, date, hours, minutes, seconds;
            year = sDate.getFullYear()
            month = sDate.getMonth() + 1;
            date = sDate.getDate();
            hours = sDate.getHours();
            minutes = sDate.getMinutes();
            seconds = sDate.getSeconds();

            month = month >= 10 ? month : '0' + month;
            date = date >= 10 ? date : '0' + date;
            hours = hours >= 10 ? hours : '0' + hours;
            minutes = minutes >= 10 ? minutes : '0' + minutes;
            seconds = seconds >= 10 ? seconds : '0' + seconds;

            let sResult = year + "." + month + "." + date + " " + hours + ":" + minutes + ":" + seconds;
            return sResult;
        } else {
            return "-"
        }
    }

    Formatter.commonUTCDate = function (data) {
        let year, month, date, hours, minutes, seconds;
        year = data.getUTCFullYear()
        month = data.getUTCMonth() + 1;
        date = data.getUTCDate();
        hours = data.getUTCHours();
        minutes = data.getUTCMinutes();
        seconds = data.getUTCSeconds();

        let sUTCZeroDate = month + "." + date + "." + year + " " + hours + ":" + minutes + ":" + seconds;
        return new Date(sUTCZeroDate);
    }

    Formatter.commonDate5 = function (data, start, today) {
        if (data != undefined) {
            let year, month, date, hours, minutes, seconds;
            let sTimezone = new Date(data).getTimezoneOffset() / 60
            let sData = Formatter.commonUTCDate(new Date(data));
            if (!today) {
                if (start) {
                    new Date(sData.setHours(24 + sTimezone), 0, 0);
                } else {
                    new Date(sData.setHours(23 + sTimezone), 59, 59);
                }
            }
            year = sData.getFullYear()
            month = sData.getMonth() + 1;
            date = sData.getDate();
            hours = sData.getHours();
            minutes = sData.getMinutes();
            seconds = sData.getSeconds();

            month = month >= 10 ? month : '0' + month;
            date = date >= 10 ? date : '0' + date;
            hours = hours >= 10 ? hours : '0' + hours;
            minutes = minutes >= 10 ? minutes : '0' + minutes;
            seconds = seconds >= 10 ? seconds : '0' + seconds;

            let sResult = year + "-" + month + "-" + date + "T" + hours + ":" + minutes + ":" + seconds + "Z";
            return sResult;
        } else {
            return "-"
        }
    }

    // => YYYY-MM-DDTHH:MM:SSZ
    Formatter.commonDate6 = function (date) {
        let localDateTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        return localDateTime.toISOString();
    }

    // => YYYY-MM
    Formatter.commonDate7 = function (data) {
        if (data != undefined) {
            let year, month, date;
            let sDate = new Date(data);
            year = sDate.getFullYear()
            month = sDate.getMonth() + 1;
            date = sDate.getDate();

            month = month >= 10 ? month : '0' + month;
            date = date >= 10 ? date : '0' + date;

            let sResult = year + "-" + month;
            return sResult;
        } else {
            return "-"
        }
    }
    Formatter.commonDate8 = function (data, start) {
        if (data != undefined) {
            let year, month, date, hours, minutes, seconds;
            let sTimezone = new Date(data).getTimezoneOffset() / 60
            let sData = Formatter.commonUTCDate(new Date(data));
            if (start) {
                sData = new Date(sData.getFullYear(), sData.getMonth()+1, 0);
                new Date(sData.setHours(24 + sTimezone), 0, 0);
            } else {
                sData = new Date(sData.getFullYear(), sData.getMonth() + 1, 0);
                sData.setHours(23 + sTimezone, 59, 59);
            }
            year = sData.getFullYear()
            month = sData.getMonth() + 1;
            date = sData.getDate();
            hours = sData.getHours();
            minutes = sData.getMinutes();
            seconds = sData.getSeconds();

            month = month >= 10 ? month : '0' + month;
            date = date >= 10 ? date : '0' + date;
            hours = hours >= 10 ? hours : '0' + hours;
            minutes = minutes >= 10 ? minutes : '0' + minutes;
            seconds = seconds >= 10 ? seconds : '0' + seconds;

            let sResult = year + "-" + month + "-" + date + "T" + hours + ":" + minutes + ":" + seconds + "Z";
            return sResult;
        } else {
            return "-"
        }
    }
    // => YYYY-MM-01T00:00:00Z
    Formatter.commonDate9 = function (date) {
        let oOnTime = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
        let localDateTime = new Date(oOnTime.getTime() - (oOnTime.getTimezoneOffset() * 60000));
        return localDateTime.toISOString();
    }
    // => YYYY-MM-01T00:00:00Z
    Formatter.commonDate10 = function (date) {
        let oOnTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        let localDateTime = new Date(oOnTime.getTime() - (oOnTime.getTimezoneOffset() * 60000));
        return localDateTime.toISOString();
    }

    Formatter.commonDate11 = function (data) {     
        if (!data) return null;
    
        if (typeof data === "number") {
            data = String(data);
        }    

        if (data instanceof Date) {
            data = data.toISOString();
        }        
        
        return data.split("T")[0];
    },
    //yyyy-MM-dd => yyyyMMdd
    Formatter.commonDate12 = function(data){
        if (!data) return null;
        
        data = data.replace(/-/g, "");
        return data;
    }
    //yyyyMMdd => yyyy-MM-dd
    Formatter.commonDate13 = function (data) {     
        if (!data) return null;
    
        if (typeof data === "number") {
            data = String(data);
        }    
    
        data = data.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
        
        return data;
    }
    



    Formatter.getYearMonth = function (date) {
        let oDate = new Date(date);
        let sYear = oDate.getFullYear().toString();
        let sMonth = String(oDate.getMonth() + 1).padStart(2, '0');
        return '0' + sYear + sMonth;
    }

    Formatter.whiteSpace = function (data) {        
        let sResult = data;
        if (data === null || data === undefined || data === "") {
            sResult = '-'
        }
        if (typeof data === "number") {
            sResult = Formatter.numberFormat3(data).toString()
            return sResult;
        }
        return sResult;
    }

    Formatter.dashToZero = function(data) {
        let sResult = data;
        if (data === null || data === undefined || data === "") {
            sResult = '0'
        }
        if (typeof data === "number") {
            sResult = Formatter.numberFormat3(data).toString()
            return sResult;
        }
        return sResult;
    }

    Formatter.amountMarking = function (data) {        
        let sResult = data;
        if (data === null || data === undefined || data === "") {
            sResult = '-'
        }
        if (typeof data === "number") {
            let iNumber = parseFloat(data);
            sResult= iNumber.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        }
        return sResult;
    }

    Formatter.parseInt = function (val) {
        return val ? Number.parseInt(val, 10) : '';
    }

    Formatter.parseIntToString = function (val) {
        return val ? Number.parseInt(val, 10) + "" : '';
    }

    Formatter.onFormatCode = function (code, aCodeData) {
        let oCode = aCodeData.find((data) => data.code === code);
        let sName = oCode ? oCode.name : "-";
        return sName;
    }

    Formatter.onFormatLangCode = function (code, aCodeData) {
        let oCode = aCodeData.find((data) => data.code === code);
        let sName = oCode ? oCode.localName : "-";
        return sName;
    }

    Formatter.setPaymentDueDate = function (oEvidencDate, iTotalDays) {
        const newDate = new Date(oEvidencDate.getTime());
        return new Date(newDate.setDate(newDate.getDate() + iTotalDays));
    };

    Formatter.setByteToUnit = function (iByteSize) {
        if (!iByteSize || isNaN(iByteSize)) return "0 MB";

        const iBytes = parseInt(iByteSize, 10);
        if (iBytes < 1024 * 1024) {
            return (iBytes / 1024).toFixed(2) + " KB"; // 1MB 미만은 KB
        } else if (iBytes < 1024 * 1024 * 1024) {
            return (iBytes / (1024 * 1024)).toFixed(2) + " MB"; // 1GB 미만은 MB
        } else {
            return (iBytes / (1024 * 1024 * 1024)).toFixed(2) + " GB"; // 그 이상은 GB
        }
    }

    Formatter.onTransferCodeToName = function (sStatusCode, aDataModel)
    {   
        if (!sStatusCode || !aDataModel || sStatusCode === undefined) {
            return "-";
        }
    
        let oStatus = aDataModel.find(item => item.code === sStatusCode);
    
        if (!oStatus) {
            return "알 수 없는 코드 유형"; 
        }
    
        return Formatter.whiteSpace(oStatus.name);   
    }
    return Formatter;
})