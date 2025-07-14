const fs = require('fs');
const yaml = require('yaml');

fs.renameSync('./package.json', './package_origin.json');
fs.renameSync('./approuter/package.json', './approuter/package_origin.json');
fs.renameSync('./approuter/xs-app.json', './approuter/xs-app_origin.json');
fs.renameSync('./mta.yaml', './mta_origin.yaml');

// package.json 추출
const bix_cap_package = fs.readFileSync('./package_origin.json', 'utf-8');
const bix_cap_package_obj = JSON.parse(bix_cap_package);
// approuter package.json 추출
const bix_app_package = fs.readFileSync('./approuter/package_origin.json', 'utf-8');
const bix_app_package_obj = JSON.parse(bix_app_package);
// approuter xs-app.json 추출
const bix_app_xs = fs.readFileSync('./approuter/xs-app_origin.json', 'utf-8');
const bix_app_xs_obj = JSON.parse(bix_app_xs);
// mta.yaml 추출
const bix_mta = fs.readFileSync('./mta_origin.yaml', 'utf-8');
const bix_mta_content = yaml.parse(bix_mta);

// package.json QA 구성
bix_cap_package_obj.name = "qa-" + bix_cap_package_obj.name;
bix_app_package_obj.name = "qa-" + bix_app_package_obj.name;

// xs-app.json 카드, ui 라우팅 구성 변경
const cardRouteConfig = bix_app_xs_obj.routes.find(item=> item.source === "^/bix/card/(.*)$");
const cardRouteConfig2 = bix_app_xs_obj.routes.find(item=> item.source === "^/bix/card/(.*)$");
const mainRouteConfig = bix_app_xs_obj.routes.find(item=> item.source === "^/main/(.*)$");
const uiRouteConfig = bix_app_xs_obj.routes.find(item=> item.source === "^/([^/]+)/(.*)$");

cardRouteConfig.target = "/qabix" + cardRouteConfig.target.split("/bix")[1];
cardRouteConfig2.target = "qabix" + cardRouteConfig2.target.split("bix")[1];
mainRouteConfig.target = "/qabix" + mainRouteConfig.target.split("/bix")[1];
uiRouteConfig.target = "/qabix" + uiRouteConfig.target.split("/bix")[1];

// mta.yaml QA 구성
const qa_modules = bix_mta_content.modules
    .filter(item => item.name === 'bix-portal-srv' || item.name === 'bix-portal')
    .map(item => ({ ...item, name: 'QA-' + item.name }));

const qa_resources = bix_mta_content.resources
    .map(item => {
        const copiedItem = {
            ...item, parameters: { ...item.parameters }
        };

        copiedItem.parameters["skip-service-updates"] = { "parameters": true };

        return copiedItem;
    });

bix_mta_content.ID = bix_mta_content.ID + '-QA';
bix_mta_content.modules = qa_modules;
bix_mta_content.resources = qa_resources;

const new_bix_mta = yaml.stringify(bix_mta_content);

fs.writeFileSync('./package.json', JSON.stringify(bix_cap_package_obj , null, 2), 'utf-8');
fs.writeFileSync('./approuter/package.json', JSON.stringify(bix_app_package_obj , null, 2), 'utf-8');
fs.writeFileSync('./approuter/xs-app.json', JSON.stringify(bix_app_xs_obj , null, 2), 'utf-8');
fs.writeFileSync('./mta.yaml', new_bix_mta, 'utf-8');