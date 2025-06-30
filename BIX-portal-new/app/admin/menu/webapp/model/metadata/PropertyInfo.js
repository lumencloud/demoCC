sap.ui.define([
], function() {
	"use strict";

	/* Property Example:
	{
	  "rank": 1,
	  "name": "Mount Everest",
	  "height": 8848,
	  "prominence": 8848,
	  "range": "Mahalangur Himalaya",
	  "coordinates": "27°59'17''N 86°55'31''E",
	  "parent_mountain": "-",
	  "first_ascent": 1953,
	  "countries": "Nepal, China"

ID
: 
"4c2e005e-7d72-465c-9f4d-e2c0e533ba03"
childMenu
: 
[{@etag: "W/"2025-03-10T06:04:47.991195300Z"", ID: "fd9b2525-aca7-412b-bd52-cd493722a4d5",…}]
createdAt
: 
"2025-03-10T06:01:50.912504200Z"
createdBy
: 
"anonymous"
description
: 
"administration"
menuCategory
: 
"admin"
menuCode
: 
"admin"
menuIconSrc
: 
"sap-icon://key-user-settings"
menuPatternUri
: 
null
menuTitle
: 
{@etag: "W/"2025-03-10T06:02:39.416267Z"", createdAt: "2025-03-10T06:02:39.416267Z",…}
menuTitle_i18nkey
: 
"adminTitle"
menuTitle_whereUse_codeKey
: 
"menu_title"
menuType
: 
"folder"
modifiedAt
: 
"2025-03-10T06:01:50.912504200Z"
modifiedBy
: 
"anonymous"
oDataUriPath
: 
null
orderSeq
: 
0
parentMenu
: 
null
useFlag
: 
true

	} */

	const aPropertyInfos = [{
		key: "id",
		label: "{i18n>p_t_id}",
		visible: true,
		path: "ID",
		dataType: "sap.ui.model.type.String"
	},{
		key: "$search",
		label: "Search",
		visible: true,
		maxConditions: 1,
		dataType: "sap.ui.model.type.String"
	}];

	return aPropertyInfos;
}, /* bExport= */false);
