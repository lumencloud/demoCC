sap.ui.define([
], function () {
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
            key: "parentSeq",
            label: "ParentSeq",
            visible: true,
            path: "parentSeq",
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
            key: "name",
            label: "Name",
            visible: true,
            path: "name",
            dataType: "sap.ui.model.type.String"
        },
        {
            key: "uiSeq",
            label: "UiSeq",
            visible: true,
            path: "uiSeq",
            dataType: "sap.ui.model.type.Integer"
        },
        {
            key: "iconSrc",
            label: "IconSrc",
            visible: true,
            path: "iconSrc",
            dataType: "sap.ui.model.type.String"
        },
        {
            key: "uriPattern",
            label: "UriPattern",
            visible: true,
            path: "uriPattern",
            dataType: "sap.ui.model.type.Boolean"
        },
        {
            key: "folderSrc",
            label: "FolderSrc",
            visible: true,
            path: "folderSrc",
            dataType: "sap.ui.model.type.String"
        },
        {
            key: "appId",
            label: "AppId",
            visible: true,
            path: "appId",
            dataType: "sap.ui.model.type.String"
        },
        {
            key: "menuType",
            label: "MenuType",
            visible: true,
            path: "menuType",
            dataType: "sap.ui.model.type.String"
        },
        {
            key: "description",
            label: "Description",
            visible: true,
            path: "description",
            dataType: "sap.ui.model.type.String"
            
        },
        {
            key: "modDate",
            label: "ModDate",
            visible: true,
            path: "modDate",
            dataType: "sap.ui.model.type.String"
            
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