sap.ui.define([], function () {
    "use strict";

    const aPropertyInfos = [
        {
            key: "seq",
            label: "Seq",
            visible: true,
            path: "seq",
            dataType: "sap.ui.model.type.String"
        },
        {
            key: "title",
            label: "Title",
            visible: true,
            path: "title",
            dataType: "sap.ui.model.type.String"
        },
        {
            key: "status",
            label: "Status",
            visible: true,
            path: "status",
            dataType: "sap.ui.model.type.String"
        },
        {
            key: "activation",
            label: "Activation",
            visible: true,
            path: "activation",
            dataType: "sap.ui.model.type.Boolean"
        },
        {
            key: "writer",
            label: "Writer",
            visible: true,
            path: "writer",
            dataType: "sap.ui.model.type.String"
        },
        {
            key: "registrationDate",
            label: "Date",
            visible: true,
            path: "registrationDate",
            dataType: "sap.ui.model.type.DateTime"
        },
       
        {
            key: "$search",
            label: "Search",
            visible: true,
            maxConditions: 1,
            dataType: "sap.ui.model.type.String"
            
        }
    ];
    return aPropertyInfos;
}, false);
