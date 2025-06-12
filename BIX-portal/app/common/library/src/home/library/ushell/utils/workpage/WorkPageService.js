// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

/**
 * @fileOverview This module communicates with the content API graphql service to retrieve workpage and visualization data.
 * @version 1.132.0
 */
sap.ui.define([
    "sap/base/i18n/Localization",
    "sap/ushell/utils/HttpClient",
    "sap/base/util/ObjectPath",
    "sap/ushell/Config",
    "sap/base/Log",
    "sap/ushell/Container",
    "sap/base/util/deepExtend",
    "../../adapters/cdm/v3/utilsCdm",
    "../../adapters/cdm/v3/_LaunchPage/readUtils",
    "../../adapters/cdm/v3/_LaunchPage/readVisualizations",
    "sap/ushell/utils",
    "sap/base/util/uid"
], function (
    Localization,
    HttpClient,
    ObjectPath,
    Config,
    Log,
    Container,
    deepExtend,
    utilsCdm,
    readUtils,
    readVisualizations,
    ushellUtils,
    uid
) {
    "use strict";

    /**
     * @alias sap.ushell.utils.workpage.WorkPageService
     * @class
     * @classdesc Service for loading WorkPages.
     *
     * @since 1.121.0
     * @private
     */
    var WorkPage = function () {
        this.httpClient = new HttpClient();
        this._sBaseUrl = Config.last("/core/workPages/contentApiUrl");

        const oUrlParams = new URLSearchParams(window.location.search);
        this._sSiteId = oUrlParams.get("siteId") || Config.last("/core/site/siteId");
    };


    /**
     * Validates the given page data. Returns a rejected promise if validation fails.
     * @param {object} oPageData The page data.
     * @returns {Promise} A promise, that is resolved if the page data is valid, else it is rejected.
     * @private
     */
    WorkPage.prototype._validateData = function (oPageData) {
        Log.debug("cep/editMode: load Page: validate", "Work Page service");
        if (oPageData.errors && oPageData.errors.length > 0) {
            return Promise.reject(oPageData.errors
                .map(function (oError) { return oError.message; })
                .join(",\n"));

        }
        if (!ObjectPath.get("data.workPage", oPageData)) {
            Log.debug("cep/editMode: load Page: validate: reject: data is empty", "Work Page service");
            return Promise.reject("Work Page data is empty");
        }
        return Promise.resolve(oPageData);
    };

    /**
     * @typedef {object} SiteData Additional visualization properties retrieved from the CDM Runtime Site
     * @property {object} [target] The harmonized navigation target of the visualization
     * @property {string} [targetURL] The target URL of the visualization
     * @property {object} [dataSource] The data source for the indicator data source of the visualization
     * @property {string} [contentProviderId] The content provider id of the visualization
     * @property {string} [contentProviderLabel] The label for the content provider of the visualization
     */

    /**
     * @typedef {object} Visualization A visualization retrieved from the content API
     * @property {string} id The id of the visualization
     * @property {string} type The type of the visualization
     * @property {object} descriptor The descriptor of the visualization
     * @property {object} descriptorResources The descriptor resources of the visualization
     * @property {object} indicatorDataSource The indicator data source of the visualization
     * @property {object} targetAppIntent The target app intent of the visualization
    */

    /**
     * @typedef {object} ExtendedVisualization An extension of a visualization retrieved from the content API
     * @property {string} id The id of the visualization
     * @property {string} type The type of the visualization
     * @property {object} descriptor The descriptor of the visualization
     * @property {object} descriptorResources The descriptor resources of the visualization
     * @property {SiteData} [_siteData] The additional app properties retrieved from the CDM Runtime Site
     * @property {string} providerId The content provider id of the visualization
    */

    /**
     * Load the WorkPage data for the given page id.
     * Additionally, load the visualizations used on that WorkPage.
     *
     * @param {string} sPageId The WorkPage id.
     * @param {boolean} bFilterByDevice Filter visualizations by device type.
     * @returns {Promise<{ workPage: {usedVisualizations: { nodes: ExtendedVisualization[] }, editable: boolean}}>}
     *  A promise resolving with the loaded work page and visualizations, enhanced with app data retrieved from the CDM Runtime Site.
     */
    WorkPage.prototype.loadWorkPageAndVisualizations = async function (sPageId, bFilterByDevice) {
        let pageInfo;
        let workPage;

        do {
            const bUseIntentNavigation = Config.last("/core/shell/intentNavigation");
            const sWorkPageQuery = this._createWorkPageQuery(this._sSiteId, sPageId, workPage === undefined, pageInfo?.endCursor, bUseIntentNavigation, bFilterByDevice);

            const oRequestedData = await this._doRequest(sWorkPageQuery);
            const oValidatedData = await this._validateData(oRequestedData);
            const oWorkPageData = await this._parseWorkPageData(oValidatedData);

            if (!workPage) {
                // on the first run init workPage
                workPage = oWorkPageData.workPage;
            } else {
                // append next page of usedVisualizations to list
                workPage.usedVisualizations.nodes.push(...oWorkPageData.workPage.usedVisualizations.nodes);
            }
            pageInfo = oWorkPageData.pageInfo;
        } while (pageInfo?.hasNextPage);

        return Promise.resolve({ workPage });
    };

    /**
     *
     * @param {string} sSiteId The Site id
     * @param {string} sPageId The WorkPage id
     * @param {boolean} bIncludeWorkPage toggles if {id, contents, editable} should also be part of the requetst. undefined object will cause errors
     * @param {string} sEndCursor endCursor of previous request
     * @param {boolean} bUseIntentNavigation Toggle to retrieve targetAppIntent if intentNavigation feature in config is true
     * @param {boolean} bFilterByDevice Filter visualizations by device type.
     * @returns {string} A GraphQL Query as a string
     */
    WorkPage.prototype._createWorkPageQuery = function (sSiteId, sPageId, bIncludeWorkPage, sEndCursor, bUseIntentNavigation, bFilterByDevice) {
        if (!sSiteId || !sPageId) {
            throw new Error(`Invalid Arguments, missing either siteId: ${sSiteId} or pageId: ${sPageId}`);
        }

        const sDeviceType = ushellUtils.getFormFactor();

        const sContentFilter = `
            queryInput: {
                filterWidgets: {
                    visualization: {
                        targetApp: {
                            deviceType: { eq: "${sDeviceType}" },
                            launchType: { in: ["embedded", "standalone"] }
                        }
                    }
                }
            }`;

        return `{
            workPage(
                siteId: "${sSiteId}",
                workPageId: "${sPageId}"
                ) {
                    ${bIncludeWorkPage ? `
                        id,
                        contents${bFilterByDevice ? `(${sContentFilter})` : ""},
                        editable,
                        ` : ""
            }
                    usedVisualizations${sEndCursor ? `(after:"${sEndCursor}")` : ""}{
                        pageInfo{
                            endCursor,
                            hasNextPage
                        }
                        nodes{
                            id,
                            ${bUseIntentNavigation ? `
                                targetAppIntent{
                                    semanticObject,
                                    action,
                                    businessAppId
                            },` : ""}
                            type,
                            descriptor{
                                value
                            },
                            descriptorResources{
                                baseUrl,
                                descriptorPath
                            },
                            provider{
                                id
                            },
                            indicatorDataSource{
                                url,
                                refreshInterval
                            }
                        }
                    }
                }
            }`.replace(/\s\s+/g, "").replace(/\n/gm, ""); // trim spaces and new line
    };

    /**
     * Load the Site and Data Destination Mappings for the given site id.
     * @returns {string} A GraphQL Query as a string
     */
    WorkPage.prototype.loadSiteAndDataDestinationMappings = function () {
        const sQuery = `{
            site(siteId:"${this._sSiteId}") {
              providers {
                nodes {
                  id,
                  logicalDataDestinationMappings {
                    logicalDestinationName,
                    resolvedUrl
                  }
                }
              }
            }
           }`.replace(/\s\s+/g, "").replace(/\n/gm, ""); // trim spaces and new line

        return this._doRequest(sQuery);
    };

    /**
     * Helper function to parse the data from the service
     *
     * @param {object} oPageData Data to be parsed for workPageDate
     * @returns {Promise} the parsed data
     */
    WorkPage.prototype._parseWorkPageData = async function (oPageData) {
        const oWorkPageData = ObjectPath.get("data.workPage.contents", oPageData);
        const aVizData = ObjectPath.get("data.workPage.usedVisualizations.nodes", oPageData) || [];
        const aTransformedVizData = await this._transformVizData(aVizData);
        const bEditable = ObjectPath.get("data.workPage.editable", oPageData) === true;
        const oPageInfo = ObjectPath.get("data.workPage.usedVisualizations.pageInfo", oPageData);

        return Promise.resolve({
            workPage: {
                contents: oWorkPageData,
                usedVisualizations: { nodes: aTransformedVizData },
                editable: bEditable
            },
            pageInfo: oPageInfo
        });
    };

    /**
     * Loads the visualizations for the current siteId, filtered by the given filter object.
     *
     * @since 1.123.0
     * @param {object} oFilterParams The filter object.
     * @param {boolean} bFilterByDevice Filter visualizations by device type.
     * @returns {Promise<{Visualizations: Visualization, totalCount}>} The result.
     */
    WorkPage.prototype.loadVisualizations = function (oFilterParams, bFilterByDevice) {
        let sQuery = `
        visualizations($queryInput: QueryVisualizationsInput) {
            visualizations(queryInput: $queryInput, siteId: "${this._sSiteId}") {
                totalCount,
                nodes {
                    id,
                    type,
                    descriptor {
                        value,
                        schemaVersion
                    },
                    descriptorResources {
                        baseUrl,
                        descriptorPath
                    },
                    indicatorDataSource {
                        url,
                        refreshInterval
                    },
                    targetAppIntent {
                        semanticObject,
                        action,
                        businessAppId
                    },
                    systemLabel
                }
            }
        }`;

        // Replace line breaks and spaces
        sQuery = sQuery
            .replace(/\n/g, "")
            .replace(/ /g, "");

        sQuery = `query ${sQuery}`;

        if (bFilterByDevice) {
            const deviceType = ushellUtils.getFormFactor();
            oFilterParams.filter = oFilterParams.filter || [{}];

            oFilterParams.filter = oFilterParams.filter.map(
                (filter) => ({
                    ...filter,
                    targetApp: {
                        deviceType: { eq: deviceType },
                        launchType: {
                            in: [
                                "embedded",
                                "standalone"
                            ]
                        }
                    }
                })
            );
        }

        const oVariables = {
            queryInput: oFilterParams
        };

        return this._doRequest(sQuery, JSON.stringify(oVariables)).then((oVizData) => {
            return {
                visualizations: oVizData.data.visualizations || [],
                totalCount: oVizData.data.totalCount || 0
            };
        });
    };

    /**
     * Do the XHR request with the given query and optional variables.
     *
     * @param {string} sQuery The query.
     * @param {string} [sVariables] The variables as JSON string. Optional.
     * @returns {Promise} Promise that resolves with the parsed JSON response if the request was successful, otherwise it is rejected.
     * @private
     */
    WorkPage.prototype._doRequest = function (sQuery, sVariables) {
        return "{}"
        // let sUrl = `${this._sBaseUrl}?query=${sQuery}`;
        // if (sVariables) {
        //     sUrl += `&variables=${encodeURIComponent(sVariables)}`;
        // }
        // return this.httpClient.get(sUrl, {
        //     headers: {
        //         "Content-Type": "application/json",
        //         Accept: "application/json",
        //         "Accept-Language": Localization.getLanguageTag().toString()
        //     }
        // }).then(function (oResponse) {
        //     if (oResponse.status < 200 || oResponse.status >= 300) {
        //         return Promise.reject("HTTP request failed with status: " + oResponse.status + " - " + oResponse.statusText);
        //     }
        //     return JSON.parse(oResponse.responseText || "{}");
        // });
    };

    /**
     * Transforms the visualization data in the result.
     * <p>
     * For all static and dynamic app launchers, the navigation target URL is
     * set in the visualization by lookup of the target app in the CDM runtime site.
     * For all dynamic app launchers, the path of the indicator data source in the
     * visualization is replaced by the corresponding path of the corresponding target
     * app which is looked up in the CDM runtime site.
     *
     * @param {object[]} aVizData the visualization data as retrieved from the content API in the usedVisualizations property.
     * @returns {Promise<object[]>} Promise that resolves with the modified visualizations data.
     * @private
     */
        WorkPage.prototype._transformVizData = async function (aVizData) {
        // performance optimization: load CDM site only if page contains standard app launcher visualizations
        const oSupportedVizData = aVizData.find((oVizData) => {
            return oVizData.type === "sap.ushell.StaticAppLauncher"
                || oVizData.type === "sap.ushell.DynamicAppLauncher"
                || this._isSmartBusinessVizType(oVizData);
        });

        if (!oSupportedVizData) {
            return Promise.resolve(aVizData);
        }

        const oCdmService = await Container.getServiceAsync("CommonDataModel");
        const oApplications = await oCdmService.getApplications();

        const aTransformedVizData = await Promise.all(aVizData.map((oVizData) => {
            if (oVizData.type === "sap.ushell.StaticAppLauncher" || oVizData.type === "sap.ushell.DynamicAppLauncher") {
                return this._setApplicationProperties(oVizData, oApplications);
            }

            if (this._isSmartBusinessVizType(oVizData)) {
                return this._setSmartBusinessTilesProperties(oVizData, oCdmService);
            }

            return oVizData;
        }));
        return Promise.resolve(aTransformedVizData);
    };

    /**
     * Sets the properties which are determined from the target app in the provided visualization data.
     * <p>
     * Target app properties are the navigation target and targetURL, the dataSources and indicatorDataSource,
     * and the contentProviderId.
     *
     * @param {object} oVizData the visualization data as retrieved from the content API in the usedVisualizations property.
     * @param {object} oApplications the applications as returned from the CommonDataModel service.
     * @returns {Promise<object>} a promise resolving with the visualization data extended with a <code>_siteData</code> object containing the
     *  additional properties retrieved from the CDM runtime site.
     * @private
     */
    WorkPage.prototype._setApplicationProperties = async function (oVizData, oApplications) {
        const sAppId = ObjectPath.get(["descriptor", "value", "sap.flp", "target", "appId"], oVizData);
        const oApplication = oApplications[sAppId];
        const sIndicatorDataSourceName = ObjectPath.get(["descriptor", "value", "sap.flp", "indicatorDataSource", "dataSource"], oVizData);
        const oDataSourceFromApp = ObjectPath.get(["sap.app", "dataSources", sIndicatorDataSourceName], oApplication);
        const sContentProviderId = ObjectPath.get(["sap.app", "contentProviderId"], oApplication);
        const sContentProviderLabel = await readUtils.getContentProviderLabel(sContentProviderId);
        const bUseIntentNavigation = Config.last("/core/shell/intentNavigation");
        const oInstantiationVizData = {
            vizConfig: ObjectPath.get(["descriptor", "value"], oVizData)
        };
        oInstantiationVizData.target = readUtils.harmonizeTarget(readVisualizations.getTarget(oInstantiationVizData) || {});
        if (bUseIntentNavigation) {
            oVizData.target = oInstantiationVizData.target;
            oVizData.targetURL = utilsCdm.toHashFromTargetIntent(oVizData.targetAppIntent, oInstantiationVizData.target);
        }

        const oExtendedVizData = deepExtend({}, oVizData, {
            _siteData: {
                contentProviderId: sContentProviderId,
                contentProviderLabel: sContentProviderLabel,
                target: bUseIntentNavigation ? "" : oInstantiationVizData.target,
                targetURL: bUseIntentNavigation ? "" : utilsCdm.toHashFromVizData(oInstantiationVizData, oApplications),
                dataSource: oDataSourceFromApp
            }
        });

        return oExtendedVizData;
    };

    /**
     * Check if smart business tile data
     * @param {object} oVizData the vizData object to check if containing smart bussiness tile viz info
     * @returns {boolean} true if smart business tiles enabled and the type of vizData is ssuite.smartbusiness.tiles.*
     * @private
     */
    WorkPage.prototype._isSmartBusinessVizType = function (oVizData) {
        return Config.last("/core/workPages/enableSmartBusiness") && oVizData.type.startsWith("ssuite.smartbusiness.tiles.");
    };

    /**
     * Sets the smart business viz info in _siteData._instantiationData
     * @param {object} oVizData smart business viz data
     * @param {CommonDataModel} oCdmService used to fetch the required vizTypes
     * @returns {Promise<object>} the viz data enriched with the smart business tile viz data
     * @private
     */
    WorkPage.prototype._setSmartBusinessTilesProperties = async function (oVizData, oCdmService) {
        const oVizTypes = await oCdmService.getVizTypes();
        var sUid = uid();

        return readUtils.getVizData(
            {
                vizTypes: oVizTypes,
                visualizations: {
                    [oVizData.id]: {
                        vizType: oVizData,
                        vizConfig: oVizData.descriptor.value
                    }
                }
            },
            {
                id: sUid,
                vizId: oVizData.id,
                vizType: oVizData.type
            })
            .then((oSMBVizData) => deepExtend({}, oVizData, {
                    _siteData: oSMBVizData,
                    vizType: oSMBVizData._instantiationData.vizType,
                    descriptor: { value: oSMBVizData.vizConfig }
                })
        );
    };

    return WorkPage;
}, /*export=*/ true);
