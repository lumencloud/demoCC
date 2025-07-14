// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

sap.ui.define([
    "./WorkPageService",
    "sap/ushell/Config"
], function (
    WorkPageService,
    Config) {
    "use strict";
    const ERROR_CODES = {
        NO_DESTINATION_FOUND: "NO_DESTINATION_FOUND",
        COULD_NOT_RETRIEVE_DESTINATIONS: "COULD_NOT_RETRIEVE_DESTINATIONS",
        NO_CARD_OR_DESTINATION_NAME: "NO_CARD_OR_DESTINATION_NAME",
        RESOLVED_URL_EMPTY: "RESOLVED_URL_EMPTY"
    };

    /**
     * Utilities for resolving destination for given Providers.
     * <p>
     *
     * @since 1.127.0
     * @private
    */
    class DestinationResolver {

        #workPageService;
        #providers = new Map();

        /**
         * Instantiate DestinationResolver, fetch all the providers for the site and cache it
         *
         * @protected
         * @since 1.127.0
         */
        constructor () {
            const oUrlParams = new URLSearchParams(window.location.search);
            this._sSiteId = oUrlParams.get("siteId") || Config.last("/core/site/siteId");
            this.fetchData();
        }

        /**
         * Fetch destination data from WorkPage Service and map the result into the provider Map.
         * Resolved with the Providers and rejects if no destinations could be found
         *
         * @typedef {string} DestinationName Name of the Destination
         * @typedef {string} ResolvedUrl Resolved URL for destination
         * @typedef {Map.<DestinationName, ResolvedUrl>} LogicalDestinations Map of logical destinations with their names and resolved URLs
         *
         * @typedef {string} ProviderId Content provider ID
         * @typedef {Map.<ProviderId, LogicalDestinations>} Provider Map of providers with their logical destinations and resolved URLs
         * @returns {Promise<Provider>} Providers with their destinations.
         * @private
         */
        _getContentProviderDestinationMappings () {
            if (!this._providerPromise) {
                this._providerPromise = new Promise((resolve, reject) => {
                    this.fetchData().then((aDestinationMappings) => {
                        aDestinationMappings.forEach((provider) => {
                            const aLogicalDestinationMaps = new Map();
                            provider.logicalDataDestinationMappings.forEach((oDataDestinationMapping) => {
                                aLogicalDestinationMaps.set(oDataDestinationMapping.logicalDestinationName, oDataDestinationMapping.resolvedUrl);
                            });
                            this.#providers.set(provider.id, aLogicalDestinationMaps);
                        });
                        return resolve(this.#providers);
                    }).catch((sReason) => {
                        reject(sReason);
                    });
                });
            }
            return this._providerPromise;
        }

        /**
        * fetch all the providers for the site and cache it
        * @returns {Promise<string>} Promise with the Destination mapping
        * @private
        * @since 1.127.0
        */
        async fetchData () {
            if (!this._dataPromise) {
                try {
                    this._dataPromise = new Promise(async (resolve, reject) => {
                        this.#workPageService = await new WorkPageService();
                        try {
                            const oDestinationResponse = await this.#workPageService.loadSiteAndDataDestinationMappings();
                            const aDestinationMappings = oDestinationResponse?.data?.site?.providers?.nodes;
                            if (aDestinationMappings && Object.keys(aDestinationMappings[0]).length) {
                                return resolve(aDestinationMappings);
                            }
                            // DestinationResolver: The service did not return any destination or content provider
                            return reject(DestinationResolver.ERROR_CODES.COULD_NOT_RETRIEVE_DESTINATIONS);
                        } catch (oError) {
                            // DestinationResolver: Couldn't Load Destinations from Service
                            return reject(DestinationResolver.ERROR_CODES.COULD_NOT_RETRIEVE_DESTINATIONS);
                        }
                    });
                } catch (oError) {
                    throw new Error("DestinationResolver: Failed to Initialize the WorkPageService", oError);
                }
            }
            return this._dataPromise;
        }

        /**
        * Get the Resolved Destination URI for a given Destination name and card
        * @param {string} sDestinationName The name of the destination to resolve
        * @param {sap.ui.integration.widgets.Card} oCard The card instance.
        * @returns {Promise<string>} Resolved destination URI
        * @private
        * @since 1.127.0
        */
        resolveCardDestination (sDestinationName, oCard) {
            return new Promise((resolve, reject) => {
                if (!sDestinationName || !oCard) {
                    return reject(ERROR_CODES.NO_CARD_OR_DESTINATION_NAME);
                }
                this._getContentProviderDestinationMappings().then((mProviders) => {
                    const sResolvedUrl = mProviders.get(oCard.getReferenceId())?.get(sDestinationName);

                    if (sResolvedUrl) {
                        return resolve(sResolvedUrl);
                    } else if (sResolvedUrl === "") {
                        return reject(ERROR_CODES.RESOLVED_URL_EMPTY);
                    }
                    // DestinationResolver: No Destinations Found
                    return reject(DestinationResolver.ERROR_CODES.NO_DESTINATION_FOUND);
                }).catch((sReason) => {
                    if (!this._sSiteId) {
                        // Fallback for designtime usecase. If there is no site ID, it's likely that the host is used in the design time.
                        // Resolve with a fallback logic
                        return resolve(`${location.origin}/dynamic_dest/${sDestinationName}`);
                    }
                    return reject(sReason);
                });
            });
        }
    }

    DestinationResolver.ERROR_CODES = ERROR_CODES;

    return DestinationResolver;
}, /*export=*/ true);

