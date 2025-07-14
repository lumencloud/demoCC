// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/base/Log"
], function (
    Log
) {
    "use strict";

    let LAYOUT_MAPPING = {
        RootDomRef: "shellLayout",
        ShellHeader: "header-shellArea",
        RendererRootView: "canvas", // default
        SidePane: "sidePane-shellArea",
        Footer: "footer-shellArea",
        ToolArea: "toolArea-shellArea",
        SubHeader: "subHeader-shellArea",
        NavigationBar: "navigationBar-shellArea",
        FloatingActions: "floatingActions-shellArea", // deprecated
        FloatingContainer: "floatingContainer-shellArea",
        FloatingContainerDockStart: "floatingContainerDockStart-shellArea",
        FloatingContainerDockEnd: "floatingContainerDockEnd-shellArea",
        ShellShapes: "shapes-shellArea",
        RightFloatingContainer: "rightFloatingContainer-shellArea",
        BackgroundImage: "backgroundImage-shellArea",
        HelpContent: "helpContent-shellArea"
    };

    function applyLayout (sRendererPlaceAtElementId) {
        let oRendererPlaceAtElement = document.getElementById(sRendererPlaceAtElementId);
        LAYOUT_MAPPING.RendererRootView = sRendererPlaceAtElementId;

        // data-sap-ui-root-content
        // Controls like sap/m/App change the element styles of all parents
        // This attribute is a marker to stop changing more parents

        let sHTMLTemplate = [
            "<div id='shellLayout' class='sapUshellFlexRow'>",
            "    <div id='backgroundImage-shellArea' data-sap-ui-root-content=true></div>",
            "    <div id='shapes-shellArea' data-sap-ui-root-content=true></div>",
            // the area "sapUshellPopupWithinArea" helps the WebAssistant colleagues to prevent popup overlaps (see sap.ui.core.Popup.setWithinArea)
            "    <div id='sapUshellPopupWithinArea' class='sapUshellFlexGrowShrink sapUshellFlexRow'>",
            "        <div id='floatingContainerDockStart-shellArea' class='sapUshellFloatingContainerDock' data-sap-ui-root-content=true></div>",
            "        <div class='sapUshellFlexGrowShrink sapUshellFlexColumn'>",
            "            <div id='header-shellArea' data-sap-ui-root-content=true></div>",
            "            <div id='subHeader-shellArea' data-sap-ui-root-content=true></div>",
            "            <div class='sapUshellFlexGrowShrink sapUshellFlexRow'>",
            "                <div id='toolArea-shellArea' class='sapUshellPositionRelative' data-sap-ui-root-content=true></div>",
            "                <div id='sidePane-shellArea' data-sap-ui-root-content=true></div>",
            "                <div class='sapUshellFlexGrowShrink sapUshellFlexColumn'>",
            "                    <div id='navigationBar-shellArea' data-sap-ui-root-content=true></div>",
            "                    <div class='sapUshellFlexGrowShrink sapUshellPositionRelative sapUshellOverflowHidden sapUshellFlexColumn'>",
            "                        <div id='" + LAYOUT_MAPPING.RendererRootView + "' class='sapUshellFlexGrowShrink sapUshellPositionRelative sapUshellShell' data-sap-ui-root-content=true></div>",
            "                        <div id='floatingActions-shellArea' data-sap-ui-root-content=true></div>", // deprecated
            "                        <div id='rightFloatingContainer-shellArea' data-sap-ui-root-content=true></div>",
            "                    </div>",
            "                </div>",
            "            </div>",
            "            <footer id='footer-shellArea' class='sapUshellPositionStatic sapMPageFooter' data-sap-ui-root-content=true></footer>",
            "        </div>",
            "        <div id='floatingContainerDockEnd-shellArea' class='sapUshellFloatingContainerDock' data-sap-ui-root-content=true></div>",
            "        <div id='floatingContainer-shellArea' data-sap-ui-root-content=true></div>",
            "    </div>",
            "    <div id='helpContent-shellArea' data-sap-ui-root-content=true></div>",
            "</div>"
        ].join("\n");

        let bLayoutAlreadyApplied = Object.keys(LAYOUT_MAPPING).some(function (sShellArea) {
            if (sShellArea === "RendererRootView") { // canvas might be present already
                return false;
            }
            let sShellAreaDomRef = LAYOUT_MAPPING[sShellArea];
            return !!document.getElementById(sShellAreaDomRef);
        });

        if (bLayoutAlreadyApplied) {
            Log.warning("Found a ShellArea element. Did not apply the layout", "sap.ushell.renderer.ShellLayout");
            return;
        }

        document.body.insertAdjacentHTML("afterbegin", "<div id='tmp'>" + sHTMLTemplate + "</div>");
        let oTmpNode = document.getElementById("tmp");
        oRendererPlaceAtElement.replaceWith.apply(oRendererPlaceAtElement, Array.from(oTmpNode.childNodes));
        oTmpNode.remove();
    }

    function destroyLayout () {
        let oRootDomRef = document.getElementById(LAYOUT_MAPPING.RootDomRef);
        if (oRootDomRef) {
            document.getElementById(LAYOUT_MAPPING.RootDomRef).remove();
        }
    }

    return {
        applyLayout: applyLayout,
        destroyLayout: destroyLayout,
        LAYOUT_MAPPING: LAYOUT_MAPPING
    };
});
