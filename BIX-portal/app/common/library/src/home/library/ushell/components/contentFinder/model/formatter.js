// Copyright (c) 2009-2023 SAP SE, All Rights Reserved
sap.ui.define([
    "sap/base/i18n/Localization",
    "sap/m/library",
    "sap/ui/core/message/MessageType"
], function (
    Localization,
    mLibrary,
    MessageType
) {
    "use strict";

    const IllustratedMessageType = mLibrary.IllustratedMessageType;
    const ListMode = mLibrary.ListMode;

    return {
        /**
         * Formatter for the visualizations list mode.
         *
         * @param {boolean} bEnablePersonalization Flag indicating if personalization is enabled.
         * @param {string} sSelectedVisualizationsFilter The selected visualization filter.
         * @returns {sap/ui/core/message/MessageType} The message type.
         *
         * @since 1.132.0
         * @private
         */
        formatVisualizationsListMode: function (bEnablePersonalization, sSelectedVisualizationsFilter) {
            if (bEnablePersonalization) {
                // Temporary, until the page builder can handle multiple selected visualizations for all types
                if (sSelectedVisualizationsFilter === "tiles") {
                    return ListMode.MultiSelect;
                }
                return ListMode.SingleSelectMaster;
            }
            return ListMode.None;
        },

        /**
         * Returns true if the visualization is already added.
         *
         * @param {string} sId The id of the visualization.
         * @param {object[]} aVisualizations The visualizations. This parameter is required to trigger the binding update! Do not remove it!
         * @returns {sap.ui.core.message.MessageType} The message type.
         */
        formatIsVisualizationAdded: function (sId, aVisualizations) {
            if (Array.isArray(aVisualizations)) {
                return this.getOwnerComponent().oRestrictedVisualizationsMap.has(sId) ? MessageType.Information : MessageType.None;
            }
            return MessageType.None;
        },

        /**
         * Formatter for the selected state of an AppBox.
         *
         * Returns true if the given vizId is found in the array of visualizations.
         *
         * @param {string} sId The id of the visualization.
         * @param {object[]} aVisualizations Array of selected visualizations.
         * @returns {boolean} True if the tile with id was found in the array
         *
         * @since 1.121
         * @private
         */
        formatVisualizationSelected: function (sId, aVisualizations) {
            return aVisualizations.some((oViz) =>
                oViz.id === sId);
        },

        /**
         * Formatter to set the title of AppSearch list.
         *
         * @param {object[]} aVisualizationsFiltersAvailable Available visualization filters.
         * @param {boolean} bFilterIsTitle Flag indicating if the filter should be used as the title.
         * @param {string} sSearchTerm GridList search field query.
         * @param {string} sCategoryTitle Selected category title.

         * @since 1.113.0
         * @private
         */
        formatAppSearchTitle: function (
            aVisualizationsFiltersAvailable,
            bFilterIsTitle,
            sSearchTerm,
            sCategoryTitle,
        ) {
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            const oSelectedFilter = aVisualizationsFiltersAvailable.find((oAvailableFilter) => {
                return oAvailableFilter.key === "cards";
            });
            let sResultText;
                    if (sSearchTerm) {
                        sResultText = oResourceBundle.getText("ContentFinder.AppSearch.Title.SearchResult", [sSearchTerm]);
                    } else if (sCategoryTitle || oSelectedFilter?.title) {
                        const sTitle = bFilterIsTitle ? oSelectedFilter?.title || sCategoryTitle : sCategoryTitle;
                        sResultText = oResourceBundle.getText("ContentFinder.AppSearch.Title.AllFromCategory", [sTitle]);
                    } 
            return sResultText;
        },
        formatAppSearchTitleCount: function (iTotalCount) {
            return iTotalCount || "" ;
        },

        /**
         * Formats the category description to concatenate content provider id and content provider label
         *
         * @param {string} sId The content provider id of the category.
         * @param {string} sLabel The content provider label of the category. This is optional.
         * @returns {string} Returns the concatenated id and label or just the id.
         *
         * @since 1.127.0
         * @private
         */
        formatCategoryDescription: function (sId, sLabel) {
            const bRtl = Localization.getRTL();

            if (!sLabel) {
                return sId;
            }

            if (bRtl) {
                return `${sLabel} • ${sId}`;
            }

            return `${sId} • ${sLabel}`;
        },

        /**
         * Formats the title of the "noData" message title if no visualizations are available in the AppSearch area.
         *
         * Fallback to default noData title if undefined is returned.
         *
         * @param {boolean} bTreeItemPressed Flag indicating if a tree item is pressed.
         * @param {string} sSearchTerm The search term in the AppSearch area.
         * @param {string} sNoItemsInCatalogTitle The desired title of the "noData" message.
         * @returns {string|undefined} The title of the "noData" message or undefined for default fallback message.
         *
         * @private
         */
        formatVisualizationsNoDataIllustratedMessageTitle: function (bTreeItemPressed, sSearchTerm, sNoItemsInCatalogTitle) {
            // If search term is provided, show the default noData description
            if (sSearchTerm) {
                return;
            }

            // If no search term is provided and a tree item is pressed, show the noItemsInCatalogTitle
            if (bTreeItemPressed && sNoItemsInCatalogTitle) {
                return sNoItemsInCatalogTitle;
            }
        },

        /**
         * Formats the title of the "noData" message description if no visualizations are available in the AppSearch area.
         *
         * Fallback to default noData description if undefined is returned.
         *
         * @param {boolean} bTreeItemPressed Flag indicating if a tree item is pressed.
         * @param {string} sSearchTerm The search term in the AppSearch area.
         * @param {string} sNoItemsInCatalogDescription The desired title of the "noData" message.
         * @returns {string|undefined} The title of the "noData" message or undefined for default fallback message.
         *
         * @private
         */
        formatVisualizationsNoDataIllustratedMessageDescription: function (
            bTreeItemPressed,
            sSearchTerm,
            sNoItemsInCatalogDescription
        ) {
            // If search term is provided, show the default noData description
            if (sSearchTerm) {
                return;
            }

            // If tree item is pressed, show provided description when available
            if (bTreeItemPressed && sNoItemsInCatalogDescription) {
                return sNoItemsInCatalogDescription;
            }
        },

        /**
         * Formats the type of the "noData" message illustration if no visualizations are available in the AppSearch area.
         *
         * @param {string} sSearchTerm The search term in the AppSearch area.
         * @returns {sap.m.IllustratedMessageType} The type of the "noData" message illustration.
         *
         * @private
         */
        formatVisualizationsNoDataIllustratedMessageType: function (sSearchTerm) {
            if (sSearchTerm) {
                return IllustratedMessageType.SearchFolder;
            }
            return IllustratedMessageType.Tent;
        },

        /**
         * Formats the accessibility description for the custom list item.
         *
         * This will be part of the string read out by the screen reader.
         *
         * @param {string} sTitle The app title.
         * @param {string} sSubtitle The app subtitle.
         * @param {string} sVisualizationId The visualization ID.
         * @param {string} sAppIdLabel The app ID label.
         * @param {string} sAppId The app ID.
         * @param {string} sSystemLabel The system ID label
         * @param {string} sSystemId The system ID.
         * @param {string} sInformationLabel The information label.
         * @param {string} sInfo The app information.
         * @param {string} sLocalContentProvider Replace missing content provider with "Local".
         * @param {boolean} bShowAppBoxFieldsPlaceholder If the fields should be shown as "not maintained" when empty.
         * @param {string} sFieldNotMaintained The field empty text.
         * @param {string} sAlreadyUsed The already used text.
         * @param {boolean} bShowLaunchButton Flag indicating if the launch button should be shown
         * @returns {string} The accessibility description for the custom list item.
         *
         * @since 1.115.0
         * @private
         */
        formatAppBoxAccDescription: function (
            sTitle,
            sSubtitle,
            sVisualizationId,
            sAppIdLabel,
            sAppId,
            sSystemLabel,
            sSystemId,
            sInformationLabel,
            sInfo,
            sLocalContentProvider,
            bShowAppBoxFieldsPlaceholder,
            sFieldNotMaintained,
            sAlreadyUsed,
            bShowLaunchButton
        ) {
            const aDescriptions = [];
            // App Title and Subtitle
            if (sTitle) {
                aDescriptions.push(sTitle);
            }
            if (sSubtitle) {
                aDescriptions.push(sSubtitle);
            }
            if (this.getOwnerComponent().oRestrictedVisualizationsMap.has(sVisualizationId)) {
                aDescriptions.push(sAlreadyUsed);
            }

            // App id
            if (sAppId) {
                aDescriptions.push(sAppIdLabel);
                aDescriptions.push(sAppId);
            } else if (bShowAppBoxFieldsPlaceholder) {
                aDescriptions.push(sAppIdLabel);
                aDescriptions.push(sFieldNotMaintained);
            }

            // System information
            aDescriptions.push(sSystemLabel);
            if (sSystemId) {
                aDescriptions.push(sSystemId);
            } else {
                aDescriptions.push(sLocalContentProvider);
            }

            // Additional Information
            if (sInfo) {
                aDescriptions.push(sInformationLabel);
                aDescriptions.push(sInfo);
            } else if (bShowAppBoxFieldsPlaceholder) {
                aDescriptions.push(sInformationLabel);
                aDescriptions.push(sFieldNotMaintained);
            }

            if (bShowLaunchButton) {
                const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
                aDescriptions.push(oResourceBundle.getText("ContentFinder.AppSearch.Button.Tooltip.LaunchApplication", [sTitle]));
            }

            return aDescriptions?.filter(Boolean).join(" . ");
        }
    };
});
