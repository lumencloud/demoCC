sap.ui.define([
	"sap/ui/core/library"
], function () {
	"use strict";
	sap.ui.getCore().initLibrary({
		name: "bix.common.library",
		version: "1.0.0",
		dependencies: ["sap.ui.core"],
		noLibraryCSS: true,
		types: [],
		interfaces: [],
		controls: [
			"bix.common.library.control.Modules",
			"bix.common.library.home.library.ui.core.Element"
		],
		elements: []
	});

	return bix.common.library;

}, /* bExport= */ false);