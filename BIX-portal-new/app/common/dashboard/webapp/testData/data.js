// Copyright (c) 2009-2023 SAP SE, All Rights Reserved
sap.ui.define([], function () {
    "use strict";

    let aVisualizations = [];
    return {
        visualizations: {
            nodes: aVisualizations
        },
        workPage: {
            id: "cep-standard-workpage",
            contents: {
                descriptor: {
                    value: {
                        title: "테스트 WorkPage",
                        description: ""
                    },
                    schemaVersion: "3.2.0"
                },
            }

        }
    };
});
