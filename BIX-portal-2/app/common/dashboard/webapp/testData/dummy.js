// Copyright (c) 2009-2023 SAP SE, All Rights Reserved
sap.ui.define([], function () {
    "use strict";

    let aVisualizations = [];

    for (let i = 0; i < 200; i++) {
        aVisualizations.push({
            id: "test-tile-app-" + i,
            type: "sap.ushell.DynamicAppLauncher",
            descriptor: {
                value: {
                    "sap.app": {
                        id: "test-tile-app-" + i,
                        applicationVersion: {
                            version: "1.0.0"
                        },
                        title: "Test App Tile " + i,
                        shortTitle: "A test app shortTitle",
                        subTitle: "A test app subtitle",
                        info: "A test app info"
                    },
                    "sap.ui": {
                        technology: "UI5",
                        icons: {
                            icon: "sap-icon://settings"
                        },
                        deviceTypes: {
                            desktop: true,
                            tablet: true,
                            phone: true
                        }
                    },
                    "sap.flp": {
                        type: "tile",
                        vizOptions: {
                            displayFormats: {
                                supported: [
                                    "standard",
                                    "standardWide",
                                    "compact",
                                    "flat",
                                    "flatWide"
                                ],
                                default: "standard"
                            }
                        },
                        target: {
                            semanticObject: "Action",
                            action: "toappnavsample"
                        },
                        indicatorDataSource: {
                            path: "https://services.odata.org/northwind/northwind.svc/Customers/$count",
                            refresh: 10
                        }
                    },
                    "sap.fiori": {
                        registrationIds: [
                            "F2424"
                        ]
                    },
                    "sap.ui5": {
                        componentName: "sap.ushell.demo.AppStateSample"
                    },
                    "sap.platform.runtime": {
                        componentProperties: {
                            url: "../../demoapps/AppStateSample"
                        }
                    }
                }
            }
        });
    }

    for (let j = 0; j < 4; j++) {
        aVisualizations.push({
            id: "test-card-app-" + j,
            type: "sap.card",
            descriptor: {
                value: {
                    "sap.app": {
                        id: "test-card-app-" + j,
                        applicationVersion: {
                            version: "1.0.0"
                        },
                        title: "Test App Card " + j,
                        shortTitle: "A test app shortTitle",
                        subTitle: "A test app subtitle",
                        info: "A card info"
                    },
                    "sap.card": {
                        type: "Analytical",
                        header: {
                            data: {
                                json: {
                                    n: "84",
                                    u: "%",
                                    trend: "Up",
                                    valueColor: "Good"
                                }
                            },
                            type: "Numeric",
                            title: "{parameters>/title/value}",
                            details: "{parameters>/details/value}",
                            subTitle: "{parameters>/subTitle/value}",
                            icon: {
                                src: "sap-icon://desktop-mobile"
                            },
                            mainIndicator: {
                                unit: "{u}",
                                state: "{valueColor}",
                                trend: "{trend}",
                                number: "{n}"
                            },
                            sideIndicators: [
                                {
                                    unit: "%",
                                    title: "Target",
                                    number: "85"
                                },
                                {
                                    unit: "%",
                                    title: "Deviation",
                                    number: "15"
                                }
                            ],
                            unitOfMeasurement: "%"
                        },
                        content: {
                            data: {
                                json: {
                                    list: [
                                        {
                                            Cost: 230000,
                                            Week: "Mar",
                                            Cost1: 24800.63,
                                            Cost2: 205199.37,
                                            Cost3: 199999.37,
                                            Budget: 210000,
                                            Target: 500000,
                                            Revenue: 78
                                        },
                                        {
                                            Cost: 238000,
                                            Week: "Apr",
                                            Cost1: 99200.39,
                                            Cost2: 138799.61,
                                            Cost3: 200199.37,
                                            Budget: 224000,
                                            Target: 500000,
                                            Revenue: 80
                                        },
                                        {
                                            Cost: 221000,
                                            Week: "May",
                                            Cost1: 70200.54,
                                            Cost2: 150799.46,
                                            Cost3: 80799.46,
                                            Budget: 238000,
                                            Target: 500000,
                                            Revenue: 82
                                        },
                                        {
                                            Cost: 280000,
                                            Week: "Jun",
                                            Cost1: 158800.73,
                                            Cost2: 121199.27,
                                            Cost3: 108800.46,
                                            Budget: 252000,
                                            Target: 500000,
                                            Revenue: 91
                                        },
                                        {
                                            Cost: 325000,
                                            Week: "Jul",
                                            Cost1: 237200.74,
                                            Cost2: 87799.26,
                                            Cost3: 187799.26,
                                            Budget: 294000,
                                            Target: 600000,
                                            Revenue: 95
                                        }
                                    ]
                                },
                                path: "/list"
                            },
                            feeds: [
                                {
                                    uid: "categoryAxis",
                                    type: "Dimension",
                                    values: [
                                        "Weeks"
                                    ]
                                },
                                {
                                    uid: "valueAxis",
                                    type: "Measure",
                                    values: [
                                        "Revenue"
                                    ]
                                }
                            ],
                            measures: [
                                {
                                    name: "Revenue",
                                    value: "{Revenue}"
                                },
                                {
                                    name: "Cost"
                                }
                            ],
                            chartType: "stacked_column",
                            dimensions: [
                                {
                                    name: "Weeks",
                                    value: "{Week}"
                                }
                            ],
                            chartProperties: {
                                title: {
                                    text: "Utilization Projection",
                                    alignment: "left"
                                },
                                plotArea: {
                                    dataLabel: {
                                        visible: false,
                                        showTotal: true
                                    }
                                },
                                valueAxis: {
                                    title: {
                                        visible: false
                                    }
                                },
                                legendGroup: {
                                    position: "bottom",
                                    alignment: "topLeft"
                                },
                                categoryAxis: {
                                    title: {
                                        visible: false
                                    }
                                }
                            }
                        },
                        configuration: {
                            parameters: {
                                title: {
                                    label: "Title",
                                    value: "Digital Practice"
                                },
                                subTitle: {
                                    label: "Subtitle",
                                    value: "Current and Forecasted Utilization"
                                },
                                details: {
                                    label: "Details",
                                    value: "Based on planned project dates"
                                }
                            }
                        }
                    },
                    "sap.ui": {
                        technology: "UI5",
                        icons: {
                            icon: "sap-icon://Fiori2/F0005"
                        },
                        deviceTypes: {
                            desktop: true,
                            tablet: true,
                            phone: true
                        }
                    },
                    "sap.ui5": {
                        componentName: "sap.ushell.demo.AppStateSample"
                    },
                    "sap.platform.runtime": {
                        componentProperties: {
                            url: "../../demoapps/AppStateSample"
                        }
                    }
                }
            }
        });
    }
    return {
        visualizations: {
            nodes: aVisualizations
        },
        workPage: {
            id: "cep-standard-workpage",
            contents: {
                descriptor: {
                    value: {
                        title: "CEP Standard WorkPage",
                        description: ""
                    },
                    schemaVersion: "3.2.0"
                },
                rows: [
                    {
                        id: "row0",
                        configurations: [],
                        descriptor: {
                            value: {
                                title: "First Section: Tiles"
                            },
                            schemaVersion: "3.2.0"
                        },
                        columns: [
                            {
                                id: "row0_col0",
                                descriptor: {
                                    value: {
                                        columnWidth: 12
                                    },
                                    schemaVersion: "3.2.0"
                                },
                                configurations: [],
                                cells: [
                                    {
                                        id: "row0_col0_cell0",
                                        descriptor: {
                                            value: {
                                                mode: "Section"
                                            },
                                            schemaVersion: "3.2.0"
                                        },
                                        configurations: [],
                                        widgets: [
                                            {
                                                id: "dynamic_tile_0",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "provider2_97176e7f-b2ea-4e31-842a-3efa5086b329#Default-VizId"
                                                }
                                            },
                                            {
                                                id: "static_tile_0",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "provider1_f95ad84a-65d0-4c39-9a67-09a4efe04f92#Default-VizId"
                                                }
                                            },
                                            {
                                                id: "lunch_tile_0",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "provider1_8adf91e9-b17a-425e-8053-f39b62f0c31e#Default-VizId"
                                                }
                                            },
                                            {
                                                id: "static_tile_1",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "provider1_a152d792-a43e-48eb-aafd-51451a6168e9#Default-VizId"
                                                }
                                            },

                                            {
                                                id: "static_tile_2",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "AppDescId1234"
                                                }
                                            },

                                            {
                                                id: "static_tile_3",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "startWDA"
                                                }
                                            },
                                            {
                                                id: "static_tile_4",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "sap.ushell.example.startURL"
                                                }
                                            },
                                            {
                                                id: "static_tile_5",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "sap.ushell.example.startURL2"
                                                }
                                            },
                                            {
                                                id: "static_tile_6",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "sap.ushell.example.startURL3"
                                                }
                                            },
                                            {
                                                id: "static_tile_7",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "sap.ushell.demo.AppNavSample"
                                                }
                                            },
                                            {
                                                id: "static_tile_8",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "sap.ushell.demo.LauncherValue"
                                                }
                                            },
                                            {
                                                id: "static_tile_9",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "sap.ushell.demo.bookmark"
                                                }
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                id: "row0_col1",
                                descriptor: {
                                    value: {
                                        columnWidth: 12
                                    },
                                    schemaVersion: "3.2.0"
                                },
                                configurations: [],
                                cells: [
                                    {
                                        id: "row0_col1_cell0",
                                        descriptor: {
                                            value: {
                                                tileMode: true
                                            },
                                            schemaVersion: "3.2.0"
                                        },
                                        configurations: [],
                                        widgets: [
                                            {
                                                id: "dynamic_tile_2",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "provider2_2ce8c859-b668-40d8-9c22-3a7dc018afd3#Default-VizId"
                                                }
                                            },
                                            {
                                                id: "static_tile_2",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",

                                                configurations: [],
                                                visualization: {
                                                    id: "provider1_f95ad84a-65d0-4c39-9a67-09a4efe04f92#Default-VizId"
                                                }
                                            },
                                            {
                                                id: "lunch_tile_2",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "provider1_8adf91e9-b17a-425e-8053-f39b62f0c31e#Default-VizId"
                                                }
                                            },
                                            {
                                                id: "lunch_tile_3",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "DisplayOnDesktopOnly"
                                                }
                                            },
                                            {
                                                id: "lunch_tile_4",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [],
                                                visualization: {
                                                    id: "OnlyInCat"
                                                }
                                            },
                                            {
                                                id: "line-card",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [
                                                    {
                                                        id: "conf_widget_0",
                                                        level: "US",
                                                        settings: {
                                                            value: {
                                                                "/sap.card/header/title": "Project Cloud Transformation (US - Widget)"
                                                            },
                                                            schemaVersion: "3.2.0"
                                                        }
                                                    },
                                                    {
                                                        id: "conf_widget_1",
                                                        level: "PR",
                                                        settings: {
                                                            value: {
                                                                "/sap.card/header/title": "Project Cloud Transformation (PR - Widget)"
                                                            },
                                                            schemaVersion: "3.2.0"
                                                        }
                                                    },
                                                    {
                                                        id: "conf_widget_2",
                                                        level: "CO",
                                                        settings: {
                                                            value: {
                                                                "/sap.card/header/title": "Project Cloud Transformation (CO - Widget)"
                                                            },
                                                            schemaVersion: "3.2.0"
                                                        }
                                                    },
                                                    {
                                                        id: "conf_widget_3",
                                                        level: "PG",
                                                        settings: {
                                                            value: {
                                                                "/sap.card/header/title": "Project Cloud Transformation (PG - Widget)"
                                                            },
                                                            schemaVersion: "3.2.0"
                                                        }
                                                    }
                                                ],
                                                visualization: {
                                                    id: "my.comp.ns.cpkg_my.company.ns.line.chart.card.app#my.company.ns.line.chart.card.viz"
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        id: "row1",
                        configurations: [],
                        descriptor: {
                            value: {
                                title: "Second Section: Cards"
                            },
                            schemaVersion: "3.2.0"
                        },
                        columns: [
                            {
                                id: "row1_col0",
                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                descriptor: {
                                    value: {
                                        columnWidth: 12
                                    },
                                    schemaVersion: "3.2.0"
                                },
                                configurations: [],
                                cells: [
                                    {
                                        id: "row1_col0_cell0",
                                        descriptor: {
                                            value: {},
                                            schemaVersion: "3.2.0"
                                        },
                                        configurations: [],
                                        widgets: [
                                            {
                                                id: "stacked-column-card",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [
                                                    {
                                                        id: "conf_widget_0",
                                                        level: "PG",
                                                        settings: {
                                                            value: {
                                                                "/sap.card/configuration/parameters/title/value": "Digital Practice (PG - Widget)"
                                                            },
                                                            schemaVersion: "3.2.0"
                                                        }
                                                    },
                                                    {
                                                        id: "conf_widget_1",
                                                        level: "CO",
                                                        settings: {
                                                            value: {
                                                                "/sap.card/configuration/parameters/title/value": "Digital Practice (CO - Widget)",
                                                                "/sap.card/configuration/parameters/subTitle/value": "Current and Forecasted Utilization (CO - Widget)"
                                                            },
                                                            schemaVersion: "3.2.0"
                                                        }
                                                    }
                                                ],
                                                visualization: {
                                                    id: "provider2_1e504721-8532-4a80-8fdd-0d88744c336f#Default-VizId"
                                                }
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                id: "row1_col1",
                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                descriptor: {
                                    value: {
                                        columnWidth: 12
                                    },
                                    schemaVersion: "3.2.0"
                                },
                                configurations: [],
                                cells: [
                                    {
                                        id: "row1_col0_cell0",
                                        tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                        instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                        descriptor: {
                                            value: {},
                                            schemaVersion: "3.2.0"
                                        },
                                        configurations: [],
                                        widgets: [
                                            {
                                                id: "table-card",
                                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a5",
                                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                                configurations: [
                                                    {
                                                        id: "conf_widget_1",
                                                        level: "CO",
                                                        settings: {
                                                            value: {
                                                                "/sap.card/configuration/parameters/title/value": "Project Staffing Watchlist (CO - Widget)"
                                                            },
                                                            schemaVersion: "3.2.0"
                                                        }
                                                    }

                                                ],
                                                visualization: {
                                                    id: "provider2_5a119bf3-8540-42b6-a0b4-059db20cd459#Default-VizId"
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        id: "row3",
                        configurations: [],
                        descriptor: {
                            value: {
                                title: "Fourth Section"
                            },
                            schemaVersion: "3.2.0"
                        },
                        columns: [
                            {
                                id: "row3_col0",
                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a2",
                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                descriptor: {
                                    value: {
                                        columnWidth: 4
                                    },
                                    schemaVersion: "3.2.0"
                                },
                                configurations: [],
                                cells: []
                            }, {
                                id: "row3_col1",
                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a2",
                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                descriptor: {
                                    value: {
                                        columnWidth: 4
                                    },
                                    schemaVersion: "3.2.0"
                                },
                                configurations: [],
                                cells: []
                            }, {
                                id: "row3_col2",
                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a2",
                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                descriptor: {
                                    value: {
                                        columnWidth: 4
                                    },
                                    schemaVersion: "3.2.0"
                                },
                                configurations: [],
                                cells: []
                            }, {
                                id: "row3_col3",
                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a2",
                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                descriptor: {
                                    value: {
                                        columnWidth: 4
                                    },
                                    schemaVersion: "3.2.0"
                                },
                                configurations: [],
                                cells: []
                            }, {
                                id: "row3_col4",
                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a2",
                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                descriptor: {
                                    value: {
                                        columnWidth: 4
                                    },
                                    schemaVersion: "3.2.0"
                                },
                                configurations: [],
                                cells: []
                            }, {
                                id: "row3_col5",
                                tenantId: "a12ff5b4-f542-4fd0-ae52-319bddd789a2",
                                instanceId: "1d59c4d7-5985-4f21-ad3c-1ac66bf14d2a",
                                descriptor: {
                                    value: {
                                        columnWidth: 4
                                    },
                                    schemaVersion: "3.2.0"
                                },
                                configurations: [],
                                cells: []
                            }
                        ]
                    }
                ]
            },
            usedVisualizations: {
                nodes: [
                    {
                        id: "provider1_8adf91e9-b17a-425e-8053-f39b62f0c31e#Default-VizId",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "tile1",
                                    title: "I am hungry",
                                    subTitle: "lets eat"
                                },
                                "sap.flp": {
                                    target: {
                                        type: "URL",
                                        url: "https://fiorilaunchpad.sap.com/sites#lunch-menu&/favorites/?language=de"
                                    },
                                    indicatorDataSource: {
                                        path: "/mockbackend/dynamictile",
                                        refresh: 60
                                    },
                                    vizOptions: {
                                        displayFormats: {
                                            supported: [
                                                "standard",
                                                "standardWide",
                                                "flat",
                                                "flatWide",
                                                "compact"
                                            ],
                                            default: "flat"
                                        }
                                    }
                                },
                                "sap.ui": {
                                    icons: {
                                        icon: "sap-icon://meal"
                                    }
                                }
                            }
                        },
                        descriptorResources: {
                            baseUrl: "",
                            descriptorPath: ""
                        }
                    },
                    {
                        id: "provider1_f95ad84a-65d0-4c39-9a67-09a4efe04f92#Default-VizId",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.ui": {
                                    icons: {
                                        icon: "sap-icon://Fiori9/F1354"
                                    }
                                },
                                "sap.app": {
                                    ach: "SLC-EVL",
                                    title: "Translate Evaluation Templates",
                                    subTitle: "Evaluation"
                                },
                                "sap.flp": {
                                    vizOptions: {
                                        displayFormats: {
                                            supported: [
                                                "standard",
                                                "standardWide",
                                                "flat",
                                                "flatWide",
                                                "compact"
                                            ],
                                            default: "standard"
                                        }
                                    },
                                    target: {
                                        type: "IBN",
                                        appId: "uyz200pp_0D3DD649E4DE6B79D2AF02C3D904A3AF",
                                        inboundId: "ET090PW4NWFHYIXAAGVEZB82L",
                                        parameters: {
                                            "sap-ui-tech-hint": {
                                                value: {
                                                    value: "UI5",
                                                    format: "plain"
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.fiori": {
                                    registrationIds: [
                                        "F2198"
                                    ]
                                }
                            }
                        },
                        descriptorResources: {
                            baseUrl: "",
                            descriptorPath: ""
                        }
                    },
                    {
                        id: "provider1_a152d792-a43e-48eb-aafd-51451a6168e9#Default-VizId",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    ach: "MM-PUR-REQ",
                                    title: "Monitor Purchase Requisition Items"
                                },
                                "sap.flp": {
                                    target: {
                                        semanticObject: "PurchaseRequisitionItem",
                                        action: "monitor"
                                    }
                                },
                                "sap.fiori": {
                                    registrationIds: [
                                        "F2424"
                                    ]
                                }
                            }
                        },
                        descriptorResources: {
                            baseUrl: "",
                            descriptorPath: ""
                        }
                    },
                    {
                        id: "provider2_97176e7f-b2ea-4e31-842a-3efa5086b329#Default-VizId",
                        type: "sap.ushell.DynamicAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    title: "Capital Projects",
                                    subTitle: "All about Finance",
                                    info: "desktop only"
                                },
                                "sap.ui": {
                                    icons: {
                                        icon: "sap-icon://capital-projects"
                                    }
                                },
                                "sap.flp": {
                                    type: "tile",
                                    vizOptions: {
                                        displayFormats: {
                                            supported: [
                                                "standard",
                                                "standardWide",
                                                "compact",
                                                "flat",
                                                "flatWide"
                                            ],
                                            default: "standard"
                                        }
                                    },
                                    target: {
                                        semanticObject: "Action",
                                        action: "toappnavsample"
                                    },
                                    indicatorDataSource: {
                                        dataSource: "https://services.odata.org",
                                        path: "https://services.odata.org/northwind/northwind.svc/Customers/$count",
                                        refresh: 10
                                    }
                                }
                            }
                        },
                        descriptorResources: {
                            baseUrl: "",
                            descriptorPath: ""
                        }
                    },
                    {
                        id: "provider2_2ce8c859-b668-40d8-9c22-3a7dc018afd3#Default-VizId",
                        type: "sap.ushell.DynamicAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    title: "Dynamic Tile",
                                    subTitle: "with separate dataSource and content provider",
                                    dataSources: {
                                        indicator: {
                                            uri: "../../test/counts"
                                        }
                                    }
                                },
                                "sap.ui": {
                                    icons: {
                                        icon: "sap-icon://number-sign"
                                    }
                                },
                                "sap.flp": {
                                    type: "tile",
                                    vizOptions: {
                                        displayFormats: {
                                            supported: [
                                                "standard",
                                                "standardWide",
                                                "compact",
                                                "flat",
                                                "flatWide"
                                            ],
                                            default: "standard"
                                        }
                                    },
                                    target: {
                                        type: "IBN",
                                        appId: "sap.ushell.demo.bookmark-LOCAL_REL_XHR_PATHPREFIX",
                                        inboundId: "target"
                                    },
                                    indicatorDataSource: {
                                        path: "count22.json",
                                        refresh: 300,
                                        dataSource: "indicator"
                                    }
                                }
                            }
                        },
                        descriptorResources: {
                            baseUrl: "",
                            descriptorPath: ""
                        }
                    },
                    {
                        id: "provider2_1e504721-8532-4a80-8fdd-0d88744c336f#Default-VizId",
                        type: "sap.card",
                        descriptor: {
                            value: {
                                "sap.ui": {
                                    icons: {
                                        icon: "sap-icon://full-stacked-column-chart"
                                    },
                                    technology: "UI5"
                                },
                                "sap.app": {
                                    id: "card.explorer.stacked.column.card",
                                    info: "Additional information about this Card",
                                    tags: {
                                        keywords: [
                                            "Analytical",
                                            "Card",
                                            "Stacked Column",
                                            "Sample"
                                        ]
                                    },
                                    type: "card",
                                    title: "Sample of a Stacked Column Chart",
                                    subTitle: "Sample of a Stacked Column Chart",
                                    shortTitle: "A short title for this Card",
                                    description: "A long description for this Card",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    }
                                },
                                _version: "1.14.0",
                                "sap.card": {
                                    type: "Analytical",
                                    header: {
                                        data: {
                                            json: {
                                                n: "84",
                                                u: "%",
                                                trend: "Up",
                                                valueColor: "Good"
                                            }
                                        },
                                        type: "Numeric",
                                        title: "{parameters>/title/value}",
                                        details: "{parameters>/details/value}",
                                        subTitle: "{parameters>/subTitle/value}",
                                        icon: {
                                            src: "sap-icon://desktop-mobile"
                                        },
                                        mainIndicator: {
                                            unit: "{u}",
                                            state: "{valueColor}",
                                            trend: "{trend}",
                                            number: "{n}"
                                        },
                                        sideIndicators: [
                                            {
                                                unit: "%",
                                                title: "Target",
                                                number: "85"
                                            },
                                            {
                                                unit: "%",
                                                title: "Deviation",
                                                number: "15"
                                            }
                                        ],
                                        unitOfMeasurement: "%"
                                    },
                                    content: {
                                        data: {
                                            json: {
                                                list: [
                                                    {
                                                        Cost: 230000,
                                                        Week: "Mar",
                                                        Cost1: 24800.63,
                                                        Cost2: 205199.37,
                                                        Cost3: 199999.37,
                                                        Budget: 210000,
                                                        Target: 500000,
                                                        Revenue: 78
                                                    },
                                                    {
                                                        Cost: 238000,
                                                        Week: "Apr",
                                                        Cost1: 99200.39,
                                                        Cost2: 138799.61,
                                                        Cost3: 200199.37,
                                                        Budget: 224000,
                                                        Target: 500000,
                                                        Revenue: 80
                                                    },
                                                    {
                                                        Cost: 221000,
                                                        Week: "May",
                                                        Cost1: 70200.54,
                                                        Cost2: 150799.46,
                                                        Cost3: 80799.46,
                                                        Budget: 238000,
                                                        Target: 500000,
                                                        Revenue: 82
                                                    },
                                                    {
                                                        Cost: 280000,
                                                        Week: "Jun",
                                                        Cost1: 158800.73,
                                                        Cost2: 121199.27,
                                                        Cost3: 108800.46,
                                                        Budget: 252000,
                                                        Target: 500000,
                                                        Revenue: 91
                                                    },
                                                    {
                                                        Cost: 325000,
                                                        Week: "Jul",
                                                        Cost1: 237200.74,
                                                        Cost2: 87799.26,
                                                        Cost3: 187799.26,
                                                        Budget: 294000,
                                                        Target: 600000,
                                                        Revenue: 95
                                                    }
                                                ]
                                            },
                                            path: "/list"
                                        },
                                        feeds: [
                                            {
                                                uid: "categoryAxis",
                                                type: "Dimension",
                                                values: [
                                                    "Weeks"
                                                ]
                                            },
                                            {
                                                uid: "valueAxis",
                                                type: "Measure",
                                                values: [
                                                    "Revenue"
                                                ]
                                            }
                                        ],
                                        measures: [
                                            {
                                                name: "Revenue",
                                                value: "{Revenue}"
                                            },
                                            {
                                                name: "Cost"
                                            }
                                        ],
                                        chartType: "stacked_column",
                                        dimensions: [
                                            {
                                                name: "Weeks",
                                                value: "{Week}"
                                            }
                                        ],
                                        chartProperties: {
                                            title: {
                                                text: "Utilization Projection",
                                                alignment: "left"
                                            },
                                            plotArea: {
                                                dataLabel: {
                                                    visible: false,
                                                    showTotal: true
                                                }
                                            },
                                            valueAxis: {
                                                title: {
                                                    visible: false
                                                }
                                            },
                                            legendGroup: {
                                                position: "bottom",
                                                alignment: "topLeft"
                                            },
                                            categoryAxis: {
                                                title: {
                                                    visible: false
                                                }
                                            }
                                        }
                                    },
                                    configuration: {
                                        parameters: {
                                            title: {
                                                label: "Title",
                                                value: "Digital Practice"
                                            },
                                            subTitle: {
                                                label: "Subtitle",
                                                value: "Current and Forecasted Utilization"
                                            },
                                            details: {
                                                label: "Details",
                                                value: "Based on planned project dates"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        configurations: [{
                            id: "conf_viz_0",
                            level: "PG",
                            settings: {
                                value: {
                                    "/sap.card/configuration/parameters/title/value": "Digital Practice (PG - Viz)"
                                },
                                schemaVersion: "3.2.0"
                            }
                        },
                            {
                                id: "conf_viz_1",
                                level: "CO",
                                settings: {
                                    value: {
                                        "/sap.card/configuration/parameters/title/value": "Digital Practice (CO - Viz)"
                                    },
                                    schemaVersion: "3.2.0"
                                }
                            }],
                        descriptorResources: {
                            baseUrl: "",
                            descriptorPath: ""
                        }
                    },
                    {
                        id: "my.comp.ns.cpkg_my.company.ns.line.chart.card.app#my.company.ns.line.chart.card.viz",
                        type: "sap.card",
                        descriptor: {
                            value: {
                                "sap.ui": {
                                    icons: {
                                        icon: "sap-icon://line-chart"
                                    },
                                    technology: "UI5"
                                },
                                "sap.app": {
                                    id: "my.company.ns.line.chart.card",
                                    i18n: "i18n/i18n.properties",
                                    info: "Additional information about this Card",
                                    tags: {
                                        keywords: [
                                            "{{DONUT_CHART_KEYWORD1}}",
                                            "{{DONUT_CHART_KEYWORD2}}",
                                            "{{DONUT_CHART_KEYWORD3}}",
                                            "{{DONUT_CHART_KEYWORD4}}"
                                        ]
                                    },
                                    type: "card",
                                    title: "Line Chart Card",
                                    subTitle: "Sample of a Line Chart",
                                    shortTitle: "A short title for this Card",
                                    description: "A long description for this Card",
                                    artifactVersion: {
                                        version: "1.0.0"
                                    }
                                },
                                "sap.flp": {
                                    vizOptions: {
                                        displayFormats: {
                                            default: "standard",
                                            supported: [
                                                "standard",
                                                "standardWide",
                                                "flat",
                                                "flatWide",
                                                "compact"
                                            ]
                                        }
                                    }
                                },
                                _version: "1.14.0",
                                "sap.card": {
                                    type: "Analytical",
                                    header: {
                                        data: {
                                            json: {
                                                unit: "K",
                                                state: "Error",
                                                trend: "Down",
                                                number: "65.34",
                                                target: {
                                                    unit: "K",
                                                    number: 100
                                                },
                                                details: "Q1, 2018",
                                                deviation: {
                                                    state: "Critical",
                                                    number: 34.7
                                                }
                                            }
                                        },
                                        type: "Numeric",
                                        title: "Project Cloud Transformation",
                                        details: "{details}",
                                        subTitle: "Revenue",
                                        mainIndicator: {
                                            unit: "{unit}",
                                            state: "{state}",
                                            trend: "{trend}",
                                            number: "{number}"
                                        },
                                        sideIndicators: [
                                            {
                                                unit: "{target/unit}",
                                                title: "Target",
                                                number: "{target/number}"
                                            },
                                            {
                                                unit: "%",
                                                state: "{deviation/state}",
                                                title: "Deviation",
                                                number: "{deviation/number}"
                                            }
                                        ],
                                        unitOfMeasurement: "EUR"
                                    },
                                    content: {
                                        data: {
                                            json: {
                                                list: [
                                                    {
                                                        Cost: 230000,
                                                        Week: "CW14",
                                                        Cost1: 24800.63,
                                                        Cost2: 205199.37,
                                                        Cost3: 199999.37,
                                                        Budget: 210000,
                                                        Target: 500000,
                                                        Revenue: 431000.22
                                                    },
                                                    {
                                                        Cost: 238000,
                                                        Week: "CW15",
                                                        Cost1: 99200.39,
                                                        Cost2: 138799.61,
                                                        Cost3: 200199.37,
                                                        Budget: 224000,
                                                        Target: 500000,
                                                        Revenue: 494000.3
                                                    },
                                                    {
                                                        Cost: 221000,
                                                        Week: "CW16",
                                                        Cost1: 70200.54,
                                                        Cost2: 150799.46,
                                                        Cost3: 80799.46,
                                                        Budget: 238000,
                                                        Target: 500000,
                                                        Revenue: 491000.17
                                                    },
                                                    {
                                                        Cost: 280000,
                                                        Week: "CW17",
                                                        Cost1: 158800.73,
                                                        Cost2: 121199.27,
                                                        Cost3: 108800.46,
                                                        Budget: 252000,
                                                        Target: 500000,
                                                        Revenue: 536000.34
                                                    },
                                                    {
                                                        Cost: 230000,
                                                        Week: "CW18",
                                                        Cost1: 140000.91,
                                                        Cost2: 89999.09,
                                                        Cost3: 100099.09,
                                                        Budget: 266000,
                                                        Target: 600000,
                                                        Revenue: 675000
                                                    },
                                                    {
                                                        Cost: 250000,
                                                        Week: "CW19",
                                                        Cost1: 172800.15,
                                                        Cost2: 77199.85,
                                                        Cost3: 57199.85,
                                                        Budget: 280000,
                                                        Target: 600000,
                                                        Revenue: 680000
                                                    },
                                                    {
                                                        Cost: 325000,
                                                        Week: "CW20",
                                                        Cost1: 237200.74,
                                                        Cost2: 87799.26,
                                                        Cost3: 187799.26,
                                                        Budget: 294000,
                                                        Target: 600000,
                                                        Revenue: 659000.14
                                                    }
                                                ],
                                                legend: {
                                                    visible: true,
                                                    position: "bottom",
                                                    alignment: "topLeft"
                                                },
                                                measures: {
                                                    costLabel: "Costs",
                                                    revenueLabel: "Revenue"
                                                },
                                                dimensions: {
                                                    weekLabel: "Weeks"
                                                }
                                            },
                                            path: "/list"
                                        },
                                        feeds: [
                                            {
                                                uid: "valueAxis",
                                                type: "Measure",
                                                values: [
                                                    "{measures/revenueLabel}",
                                                    "{measures/costLabel}"
                                                ]
                                            },
                                            {
                                                uid: "categoryAxis",
                                                type: "Dimension",
                                                values: [
                                                    "{dimensions/weekLabel}"
                                                ]
                                            }
                                        ],
                                        measures: [
                                            {
                                                name: "{measures/revenueLabel}",
                                                value: "{Revenue}"
                                            },
                                            {
                                                name: "{measures/costLabel}",
                                                value: "{Cost}"
                                            }
                                        ],
                                        chartType: "Line",
                                        dimensions: [
                                            {
                                                name: "{dimensions/weekLabel}",
                                                value: "{Week}"
                                            }
                                        ],
                                        chartProperties: {
                                            title: {
                                                text: "Line Chart",
                                                visible: true,
                                                alignment: "left"
                                            },
                                            legend: {
                                                visible: "{legend/visible}"
                                            },
                                            plotArea: {
                                                dataLabel: {
                                                    visible: true
                                                }
                                            },
                                            valueAxis: {
                                                title: {
                                                    visible: false
                                                }
                                            },
                                            legendGroup: {
                                                layout: {
                                                    position: "{legend/position}",
                                                    alignment: "{legend/alignment}"
                                                }
                                            },
                                            categoryAxis: {
                                                title: {
                                                    visible: false
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        configurations: [
                            {
                                id: "conf_viz_0",
                                level: "US",
                                settings: {
                                    value: {
                                        "/sap.card/header/title": "Project Cloud Transformation (US - Viz)"
                                    },
                                    schemaVersion: "3.2.0"
                                }
                            },
                            {
                                id: "conf_viz_1",
                                level: "PR",
                                settings: {
                                    value: {
                                        "/sap.card/header/title": "Project Cloud Transformation (PR - Viz)"
                                    },
                                    schemaVersion: "3.2.0"
                                }
                            },
                            {
                                id: "conf_viz_2",
                                level: "CO",
                                settings: {
                                    value: {
                                        "/sap.card/header/title": "Project Cloud Transformation (CO - Viz)"
                                    },
                                    schemaVersion: "3.2.0"
                                }
                            },
                            {
                                id: "conf_viz_3",
                                level: "PG",
                                settings: {
                                    value: {
                                        "/sap.card/header/title": "Project Cloud Transformation (PG - Viz)",
                                        "/sap.card/header/subTitle": "Revenue (PG - Viz)"
                                    },
                                    schemaVersion: "3.2.0"
                                }
                            }
                        ],
                        descriptorResources: {
                            baseUrl: "/content-repository/v2/cards/my.company.ns.line.chart.card/e1087df0d5fcc0818a58d0ef778ee683",
                            descriptorPath: ""
                        }
                    },
                    {
                        id: "provider2_5a119bf3-8540-42b6-a0b4-059db20cd459#Default-VizId",
                        type: "sap.card",
                        descriptor: {
                            value: {
                                "sap.ui": {
                                    icons: {
                                        icon: "sap-icon://table-view"
                                    },
                                    technology: "UI5"
                                },
                                "sap.app": {
                                    id: "card.explorer.table.card",
                                    info: "Additional information about this Card",
                                    tags: {
                                        keywords: [
                                            "Table",
                                            "Card",
                                            "Sample"
                                        ]
                                    },
                                    type: "card",
                                    title: "Sample of a Table Card",
                                    subTitle: "Sample of a Table Card",
                                    shortTitle: "A short title for this Card",
                                    description: "A long description for this Card",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    }
                                },
                                _version: "1.15.0",
                                "sap.card": {
                                    data: {
                                        json: [
                                            {
                                                status: "Canceled",
                                                netAmount: "29",
                                                salesOrder: "5000010050",
                                                statusState: "Error",
                                                customerName: "Robert Brown",
                                                deliveryProgress: 59
                                            },
                                            {
                                                status: "Starting",
                                                netAmount: "30 | 230",
                                                salesOrder: "5000010051",
                                                statusState: "Warning",
                                                customerName: "SAP ERP Metraneo",
                                                deliveryProgress: 85
                                            },
                                            {
                                                status: "In Progress",
                                                netAmount: "12 | 69",
                                                salesOrder: "5000010052",
                                                statusState: "Error",
                                                customerName: "4KG AG",
                                                deliveryProgress: 50
                                            },
                                            {
                                                status: "Delayed",
                                                netAmount: "84",
                                                salesOrder: "5000010052",
                                                statusState: "Warning",
                                                customerName: "Clonemine",
                                                deliveryProgress: 41
                                            }
                                        ],
                                        mockData: {
                                            json: [
                                                {
                                                    status: "Canceled",
                                                    netAmount: "29",
                                                    salesOrder: "5000010050",
                                                    statusState: "Error",
                                                    customerName: "[Mocked] Robert Brown",
                                                    deliveryProgress: 59
                                                },
                                                {
                                                    status: "Starting",
                                                    netAmount: "30 | 230",
                                                    salesOrder: "5000010051",
                                                    statusState: "Warning",
                                                    customerName: "[Mocked] SAP ERP Metraneo",
                                                    deliveryProgress: 85
                                                },
                                                {
                                                    status: "In Progress",
                                                    netAmount: "12 | 69",
                                                    salesOrder: "5000010052",
                                                    statusState: "Error",
                                                    customerName: "[Mocked] 4KG AG",
                                                    deliveryProgress: 50
                                                },
                                                {
                                                    status: "Delayed",
                                                    netAmount: "84",
                                                    salesOrder: "5000010052",
                                                    statusState: "Warning",
                                                    customerName: "[Mocked] Clonemine",
                                                    deliveryProgress: 41
                                                }
                                            ]
                                        }
                                    },
                                    type: "Table",
                                    header: {
                                        title: "{parameters>/title/value}",
                                        subTitle: "{parameters>/subTitle/value}",
                                        actions: []
                                    },
                                    content: {
                                        row: {
                                            actions: [],
                                            columns: [
                                                {
                                                    title: "Project",
                                                    value: "{salesOrder}",
                                                    identifier: true
                                                },
                                                {
                                                    title: "Customer",
                                                    value: "{customerName}"
                                                },
                                                {
                                                    title: "Staffing",
                                                    value: "{netAmount}",
                                                    hAlign: "End"
                                                },
                                                {
                                                    state: "{statusState}",
                                                    title: "Status",
                                                    value: "{status}"
                                                },
                                                {
                                                    title: "Staffing",
                                                    progressIndicator: {
                                                        text: "{= format.percent(${deliveryProgress} / 100)}",
                                                        state: "{statusState}",
                                                        percent: "{deliveryProgress}"
                                                    }
                                                }
                                            ]
                                        }
                                    },
                                    configuration: {
                                        parameters: {
                                            title: {
                                                label: "Title",
                                                value: "Project Staffing Watchlist"
                                            },
                                            subTitle: {
                                                label: "Subtitle",
                                                value: "Today"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        descriptorResources: {
                            baseUrl: "",
                            descriptorPath: ""
                        },
                        configurations: [
                            {
                                id: "conf_viz_0",
                                level: "US",
                                settings: {
                                    value: {
                                        "/sap.card/configuration/parameters/subTitle/value": "Today (US - Viz)"
                                    },
                                    schemaVersion: "3.2.0"
                                }
                            }
                        ]

                    },
                    {
                        id: "AppDescId1234",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "AppDescId1234",
                                    title: "translated title of application",
                                    ach: "FIN-XX",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    destination: {
                                        name: "U1YCLNT000"
                                    },
                                    crossNavigation: {
                                        inbounds: {
                                            start: {
                                                semanticObject: "Start",
                                                action: "me",
                                                signature: {
                                                    parameters: {
                                                        myParam: {
                                                            defaultValue: {
                                                                value: "myValue"
                                                            },
                                                            required: true
                                                        }
                                                    },
                                                    additionalParameters: "allowed"
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.ui5": {
                                    componentName: "sap.ushell.StaticAppLauncher"
                                },
                                "sap.ui": {
                                    technology: "WDA",
                                    icons: {
                                        icon: "sap-icon:\\/\\/Fiori2\\/F0018"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: false,
                                        phone: false
                                    }
                                },
                                "sap.wda": {
                                    applicationId: "WDR_TEST_PORTAL_NAV_TARGET"
                                },
                                "sap.flp": {
                                    type: "application",
                                    vizOptions: {
                                        displayFormats: {
                                            supported: [
                                                "standard",
                                                "standardWide",
                                                "flat",
                                                "flatWide",
                                                "compact"
                                            ],
                                            default: "flatWide"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        id: "DisplayOnDesktopOnly",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    title: "Display only on Desktop",
                                    id: "DisplayOnDesktopOnly",
                                    ach: "FIN-XX",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    crossNavigation: {
                                        inbounds: {
                                            start: {
                                                semanticObject: "Display",
                                                action: "Desktop"
                                            }
                                        }
                                    }
                                },
                                "sap.ui": {
                                    technology: "UI5",
                                    icons: {
                                        icon: "sap-icon:\\/\\/Fiori2\\/F0018"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: false,
                                        phone: false
                                    }
                                },
                                "sap.flp": {
                                    type: "application",
                                    vizOptions: {
                                        displayFormats: {
                                            supported: [
                                                "standard",
                                                "standardWide",
                                                "flat",
                                                "flatWide",
                                                "compact"
                                            ],
                                            default: "standardWide"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        id: "DisplayOnMobileOnly",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    title: "Display on Mobile",
                                    id: "DisplayOnMobileOnly",
                                    ach: "FIN-XX",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    crossNavigation: {
                                        inbounds: {
                                            start: {
                                                semanticObject: "Display",
                                                action: "mobile"
                                            }
                                        }
                                    }
                                },
                                "sap.ui": {
                                    technology: "UI5",
                                    icons: {
                                        icon: "sap-icon:\\/\\/Fiori2\\/F0018"
                                    },
                                    deviceTypes: {
                                        desktop: false,
                                        tablet: false,
                                        phone: true
                                    }
                                },
                                "sap.flp": {
                                    type: "application"
                                }
                            }
                        }
                    },
                    {
                        id: "DisplayOnTabletOnly",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    title: "Display on Tablet",
                                    id: "DisplayOnTabletOnly",
                                    ach: "FIN-XX",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    crossNavigation: {
                                        inbounds: {
                                            start: {
                                                semanticObject: "Display",
                                                action: "tablet"
                                            }
                                        }
                                    }
                                },
                                "sap.ui": {
                                    technology: "UI5",
                                    icons: {
                                        icon: "sap-icon:\\/\\/Fiori2\\/F0018"
                                    },
                                    deviceTypes: {
                                        desktop: false,
                                        tablet: true,
                                        phone: false
                                    }
                                },
                                "sap.flp": {
                                    type: "application"
                                }
                            }
                        }
                    },
                    {
                        id: "OnlyInCat",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "OnlyInCat",
                                    title: "This App only in a catalog",
                                    ach: "FIN-XX",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    destination: {
                                        name: "U1YCLNT000"
                                    },
                                    crossNavigation: {
                                        inbounds: {
                                            start: {
                                                semanticObject: "Only",
                                                action: "incat",
                                                signature: {}
                                            }
                                        }
                                    }
                                },
                                "sap.ui": {
                                    technology: "WDA",
                                    icons: {
                                        icon: "sap-icon:\\/\\/Fiori2\\/F0022"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: false,
                                        phone: false
                                    }
                                },
                                "sap.wda": {
                                    applicationId: "WDR_TEST_PORTAL_NAV_TARGET"
                                },
                                "sap.flp": {
                                    type: "application"
                                }
                            }
                        }
                    },
                    {
                        id: "startWDA",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "startWDA",
                                    title: "Generic starter for WDA",
                                    subTitle: "sub title",
                                    ach: "CA-UI2-INT-FE",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    crossNavigation: {
                                        inbounds: {
                                            inb1: {
                                                semanticObject: "Shell",
                                                action: "startWda",
                                                title: "start wda",
                                                signature: {
                                                    parameters: {},
                                                    additionalParameters: "allowed"
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.ui": {
                                    technology: "WDA",
                                    icons: {
                                        icon: "sap-icon:\\/\\/Fiori2\\/F0018"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: false,
                                        phone: false
                                    }
                                },
                                "sap.wda": {
                                    applicationId: "WDR_TEST_PORTAL_NAV_TARGET"
                                },
                                "sap.flp": {
                                    type: "application"
                                }
                            }
                        }
                    },
                    {
                        id: "sap.ushell.example.startURL",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "X-SAP-UI2-CATALOGPAGE:ZGFCATA:ET091D7N8BTE2AR8TMMBRPBCK",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    title: "New York Times",
                                    subTitle: "",
                                    info: "The New York Times is an American daily newspaper",
                                    crossNavigation: {
                                        inbounds: {
                                            "Shell-launchURL": {
                                                semanticObject: "Shell",
                                                action: "launchURL",
                                                signature: {
                                                    parameters: {
                                                        "sap-external-url": {
                                                            required: true,
                                                            filter: {
                                                                value: "https://www.nytimes.com",
                                                                format: "plain"
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.ui": {
                                    _version: "1.3.0",
                                    technology: "URL",
                                    icons: {
                                        icon: "sap-icon://world"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: true,
                                        phone: true
                                    }
                                },
                                "sap.url": {
                                    uri: "https://www.nytimes.com"
                                }
                            }
                        }
                    },
                    {
                        id: "sap.ushell.example.startURL2",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "sap.ushell.example.startURL2",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    title: "Example Page...",
                                    subTitle: "a real example",
                                    description: "X-SAP-UI2-CATALOGPAGE:ZGFCATA:ET091D7N8BTE2AR8TMMBRPBCK",
                                    crossNavigation: {
                                        inbounds: {
                                            "Shell-launchURL": {
                                                semanticObject: "Shell",
                                                action: "launchURL",
                                                signature: {
                                                    parameters: {
                                                        "sap-external-url": {
                                                            required: true,
                                                            filter: {
                                                                value: "https://www.example.com",
                                                                format: "plain"
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.ui": {
                                    _version: "1.3.0",
                                    technology: "URL",
                                    icons: {
                                        icon: "sap-icon://world"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: true,
                                        phone: true
                                    }
                                },
                                "sap.platform.runtime": {
                                    uri: "https://www.example.com"
                                }
                            }
                        }
                    },
                    {
                        id: "sap.ushell.example.startURL3",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "sap.ushell.example.startURL3",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    title: "UI5 Demokit",
                                    subTitle: "a real demokit!",
                                    description: "X-SAP-UI2-CATALOGPAGE:ZGFCATA:ET091D7N8BTE2AR8TMMBRPBCK",
                                    crossNavigation: {
                                        inbounds: {
                                            "Shell-launchURL": {
                                                semanticObject: "Shell",
                                                action: "launchURL",
                                                signature: {
                                                    parameters: {
                                                        "sap-external-url": {
                                                            required: true,
                                                            filter: {
                                                                value: "https://ui5.sap.com",
                                                                format: "plain"
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.ui": {
                                    _version: "1.3.0",
                                    technology: "URL",
                                    icons: {
                                        icon: "sap-icon://sap-ui5"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: true,
                                        phone: true
                                    }
                                },
                                "sap.platform.runtime": {
                                    uri: "https://www.example.com"
                                }
                            }
                        }
                    },
                    {
                        id: "sap.ushell.demo.AppNavSample",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "sap.ushell.demo.AppNavSample",
                                    title: "Demo actual title AppNavSample : Demos startup parameter passing",
                                    subTitle: "AppNavSample",
                                    ach: "CA-UI2-INT-FE",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    crossNavigation: {
                                        inbounds: {
                                            inb1: {
                                                semanticObject: "Action",
                                                action: "toappnavsample",
                                                title: "This AppNavSample action has a special default value, but requires /ui2/par",
                                                signature: {
                                                    parameters: {
                                                        "/ui2/par": {
                                                            required: true
                                                        },
                                                        aand: {
                                                            defaultValue: {
                                                                value: "ddd=1234"
                                                            }
                                                        }
                                                    },
                                                    additionalParameters: "allowed"
                                                }
                                            },
                                            inb2: {
                                                semanticObject: "Action",
                                                action: "toappnavsample",
                                                signature: {
                                                    parameters: {
                                                        P1: {
                                                            renameTo: "P1New"
                                                        }
                                                    },
                                                    additionalParameters: "allowed"
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.flp": {
                                    type: "application"
                                },
                                "sap.ui": {
                                    technology: "UI5",
                                    icons: {
                                        icon: "sap-icon://Fiori2/F0018"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: false,
                                        phone: false
                                    }
                                },
                                "sap.ui5": {
                                    componentName: "sap.ushell.demo.AppNavSample"
                                },
                                "sap.platform.runtime": {
                                    componentProperties: {
                                        url: "../../demoapps/AppNavSample?A=URL"
                                    }
                                }
                            }
                        }
                    },
                    {
                        id: "sap.ushell.demo.LauncherValue",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "sap.ushell.demo.LauncherValue",
                                    title: "LauncherValue gets attached",
                                    subTitle: "Launch with value",
                                    ach: "CA-UI2-INT-FE",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    crossNavigation: {
                                        inbounds: {
                                            inb1: {
                                                semanticObject: "Action",
                                                action: "toLauncher",
                                                signature: {
                                                    parameters: {
                                                        launch: {
                                                            required: true,
                                                            launcherValue: {
                                                                value: "putMeIntoTile"
                                                            }
                                                        },
                                                        aand: {
                                                            defaultValue: {
                                                                value: "ddd=1234"
                                                            }
                                                        }
                                                    },
                                                    additionalParameters: "allowed"
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.flp": {
                                    type: "application"
                                },
                                "sap.ui": {
                                    technology: "UI5",
                                    icons: {
                                        icon: "sap-icon://Fiori2/F0018"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: false,
                                        phone: false
                                    }
                                },
                                "sap.ui5": {
                                    componentName: "sap.ushell.demo.AppNavSample"
                                },
                                "sap.platform.runtime": {
                                    componentProperties: {
                                        url: "../../demoapps/AppNavSample?A=URL"
                                    }
                                }
                            }
                        }
                    },
                    {
                        id: "sap.ushell.demo.bookmark",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "sap.ushell.demo.bookmark",
                                    title: "Bookmark Sample App",
                                    subTitle: "sample subtitle",
                                    ach: "CA-UI2-INT-FE",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    crossNavigation: {
                                        inbounds: {
                                            target: {
                                                semanticObject: "Action",
                                                action: "toBookmark",
                                                signature: {
                                                    parameters: {},
                                                    additionalParameters: "allowed"
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.flp": {
                                    type: "application"
                                },
                                "sap.ui": {
                                    technology: "UI5",
                                    icons: {
                                        icon: "sap-icon://favorite"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: true,
                                        phone: true
                                    }
                                },
                                "sap.ui5": {
                                    componentName: "sap.ushell.demo.bookmark"
                                },
                                "sap.platform.runtime": {
                                    componentProperties: {
                                        url: "../../demoapps/BookmarkSample"
                                    }
                                }
                            }
                        }
                    },
                    {
                        id: "OverloadedApp1",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "OverloadedApp1",
                                    title: "Bookmark Sample",
                                    subTitle: "#Overloaded-start",
                                    ach: "CA-UI2-INT-FE",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    crossNavigation: {
                                        inbounds: {
                                            "Overloaded-start": {
                                                semanticObject: "Overloaded",
                                                action: "start",
                                                signature: {
                                                    parameters: {},
                                                    additionalParameters: "allowed"
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.flp": {
                                    type: "application"
                                },
                                "sap.ui": {
                                    technology: "UI5",
                                    icons: {
                                        icon: "sap-icon://favorite"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: true,
                                        phone: true
                                    }
                                },
                                "sap.ui5": {
                                    componentName: "sap.ushell.demo.bookmark"
                                },
                                "sap.platform.runtime": {
                                    componentProperties: {
                                        url: "../../demoapps/BookmarkSample"
                                    }
                                }
                            }
                        }
                    },
                    {
                        id: "OverloadedApp2",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "OverloadedApp2",
                                    title: "AppNav Sample",
                                    subTitle: "#Overloaded-start",
                                    ach: "CA-UI2-INT-FE",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    crossNavigation: {
                                        inbounds: {
                                            "Overloaded-start": {
                                                semanticObject: "Overloaded",
                                                action: "start",
                                                signature: {
                                                    parameters: {},
                                                    additionalParameters: "allowed"
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.flp": {
                                    type: "application"
                                },
                                "sap.ui": {
                                    technology: "UI5",
                                    icons: {
                                        icon: "sap-icon://Fiori2/F0018"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: false,
                                        phone: false
                                    }
                                },
                                "sap.ui5": {
                                    componentName: "sap.ushell.demo.AppNavSample"
                                },
                                "sap.platform.runtime": {
                                    componentProperties: {
                                        url: "../../demoapps/AppNavSample?A=URL"
                                    }
                                }
                            }
                        }
                    },
                    {
                        id: "parameterRenameCase1",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "X-PAGE:/UI2/FLP_DEMO_SAMPLEAPPS_UI5DK:00O2TRA8B06OQ70S",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    title: "Action parameter Rename Case 1",
                                    subTitle: "parameter Rename Case 1",
                                    ach: "CA-UI2-INT-FE",
                                    crossNavigation: {
                                        inbounds: {
                                            "Action-parameterRename": {
                                                semanticObject: "Action",
                                                action: "parameterRename",
                                                signature: {
                                                    additionalParameters: "allowed",
                                                    parameters: {
                                                        Case: {
                                                            defaultValue: {
                                                                value: "1"
                                                            }
                                                        },
                                                        Description: {
                                                            defaultValue: {
                                                                value: "P1 -> P1New, P2 -> P2New"
                                                            }
                                                        },
                                                        P1: {
                                                            renameTo: "P1New"
                                                        },
                                                        P2: {
                                                            renameTo: "P1New"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.ui": {
                                    technology: "UI5",
                                    icons: {
                                        icon: "sap-icon://Fiori2/F0005"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: true,
                                        phone: true
                                    }
                                },
                                "sap.ui5": {
                                    componentName: "sap.ushell.demoapps.ReceiveParametersTestApp"
                                },
                                "sap.platform.runtime": {
                                    componentProperties: {
                                        url: "../../demoapps/ReceiveParametersTestApp"
                                    }
                                }
                            }
                        }
                    },
                    {
                        id: "appstateformsampledynamictile",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "appstateformsampledynamictile",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    title: "App State form sample",
                                    subTitle: "parameter Rename Case 1",
                                    ach: "CA-UI2-INT-FE",
                                    crossNavigation: {
                                        inbounds: {
                                            "Action-toappstateformsample": {
                                                semanticObject: "Action",
                                                action: "toappstateformsample",
                                                indicatorDataSource: {
                                                    path: "../../test/counts/count1.json"
                                                },
                                                signature: {
                                                    additionalParameters: "allowed",
                                                    parameters: {
                                                        Case: {
                                                            defaultValue: {
                                                                value: "1"
                                                            }
                                                        },
                                                        Description: {
                                                            defaultValue: {
                                                                value: "Showed some dynamic tiles"
                                                            }
                                                        },
                                                        P1: {
                                                            renameTo: "P1New"
                                                        },
                                                        P2: {
                                                            renameTo: "P1New"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.ui": {
                                    technology: "UI5",
                                    icons: {
                                        icon: "sap-icon://Fiori2/F0005"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: true,
                                        phone: true
                                    }
                                },
                                "sap.ui5": {
                                    componentName: "sap.ushell.demo.AppStateFormSample"
                                },
                                "sap.platform.runtime": {
                                    componentProperties: {
                                        url: "../../demoapps/AppStateFormSample"
                                    }
                                }
                            }
                        }
                    },
                    {
                        id: "AppStateSampleIcon",
                        type: "sap.ushell.StaticAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "AppStateSampleIcon",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    title: "App State - Icons",
                                    shortTitle: "icons",
                                    subTitle: "icons with categories",
                                    ach: "CA-UI2-INT-FE",
                                    crossNavigation: {
                                        inbounds: {
                                            "Action-toappstatesample": {
                                                semanticObject: "Action",
                                                action: "toappstatesample",
                                                signature: {
                                                    additionalParameters: "allowed",
                                                    parameters: {}
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.ui": {
                                    technology: "UI5",
                                    icons: {
                                        icon: "sap-icon://Fiori2/F0005"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: true,
                                        phone: true
                                    }
                                },
                                "sap.ui5": {
                                    componentName: "sap.ushell.demo.AppStateSample"
                                },
                                "sap.platform.runtime": {
                                    componentProperties: {
                                        url: "../../demoapps/AppStateSample"
                                    }
                                }
                            }
                        }
                    },
                    {
                        id: "AppPersSampleFav",
                        type: "sap.ushell.DynamicAppLauncher",
                        descriptor: {
                            value: {
                                "sap.app": {
                                    id: "AppPersSampleFav",
                                    applicationVersion: {
                                        version: "1.0.0"
                                    },
                                    title: "App Personalization Sample Favourites",
                                    subTitle: "set favourites",
                                    shortTitle: "fav",
                                    ach: "CA-UI2-INT-FE",
                                    crossNavigation: {
                                        inbounds: {
                                            "Action-toAppPersSampleFav": {
                                                semanticObject: "Action",
                                                action: "toAppPersSampleFav",
                                                signature: {
                                                    additionalParameters: "allowed",
                                                    parameters: {}
                                                }
                                            }
                                        }
                                    }
                                },
                                "sap.ui": {
                                    technology: "UI5",
                                    icons: {
                                        icon: "sap-icon://undefined/favorite"
                                    },
                                    deviceTypes: {
                                        desktop: true,
                                        tablet: true,
                                        phone: true
                                    }
                                },
                                "sap.ui5": {
                                    componentName: "sap.ushell.demo.AppPersSample"
                                },
                                "sap.platform.runtime": {
                                    componentProperties: {
                                        url: "../../demoapps/AppPersSample"
                                    }
                                }
                            }
                        }
                    }
                ]
            }

        }
    };
});
