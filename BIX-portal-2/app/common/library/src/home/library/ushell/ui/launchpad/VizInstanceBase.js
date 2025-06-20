// Copyright (c) 2009-2023 SAP SE, All Rights Reserved
// Local VizInstanceBase
sap.ui.define([
    "sap/ui/core/Control"
], function (
    Control
) {
    "use strict";

    /**
     * @alias sap.ushell.ui.launchpad.VizInstanceBase
     * @class
     * @classdesc Wrapper control for tiles. This control must only be created via {@link sap.ushell.services.VisualizationInstantiation#instantiateVisualization}
     *
     * @hideconstructor
     * @extends sap.ui.core.Control
     *
     * @since 1.121.0
     * @private
     * @ui5-restricted sap.esh.search.ui ux.eng.s4producthomes1
     */
    let VizInstanceBase = Control.extend("sap.ushell.ui.launchpad.VizInstanceBase", /** @lends sap.ushell.ui.launchpad.VizInstanceBase.prototype*/ {
        metadata: {
            library: "sap.ushell",
            properties: {
                /**
                 * Current active state. Can be used to update visibility of the VizInstance.
                 */
                active: { type: "boolean", defaultValue: false }
            }
        },
        renderer: (rm, vizInstance) => {
            rm.openStart("div", vizInstance);
            rm.class("sapUshellVizInstanceBase");
            rm.close("div");
        }
    });

    return VizInstanceBase;
});
