sap.ui.define([
    "sap/m/MessageBox"
], function (MessageBox) {
    "use strict";

    return {
        _getData: function (sUrl) {
            let settings = {
                type: "get",
                async: true,
                url: sUrl,
            };
            return new Promise((resolve) => {
                $.ajax(settings)
                    .done((oResult) => {
                        resolve(oResult);
                    })
                    .fail(function (xhr) {
                        console.log(xhr);
                    })
            });
        },

        /**
         * 메시지 박스 생성 함수
         * @param {String} status 
         * @param {String} message 
         * @param {String} title 
         */
        _messageBox: function (status, message, title) {
            MessageBox[status](message, {
                title: title,
            })
        },
    };
});