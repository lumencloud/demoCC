sap.ui.define([
	"sap/ui/core/library"
], function () {
	"use strict";
	sap.ui.getCore().initLibrary({
		name: "bix.common.ai",
		version: "1.0.0",
		dependencies: ["sap.ui.core"],
		noLibraryCSS: true,
		types: [],
		interfaces: [],
		controls: [
			"bix.common.ai.service.AgentService",
			"bix.common.ai.service.ApiService",
			"bix.common.ai.util.AsyncTaskManager",
			"bix.common.ai.util.InteractionUtils",
			"bix.common.ai.util.JSONParser"
		],
		elements: []
	});

	return bix.common.ai;

}, /* bExport= */ false);