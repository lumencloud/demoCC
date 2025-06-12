const fs = require('fs');
const fg = require('fast-glob');
const yaml = require('yaml');

// mta.yaml 수정
// 모든 manitest.json sap.app 수정
async function qa_setting() {

    const settingManifest = async function (fileList) {
        for (const manifest_path of fileList) {
            if (!manifest_path.includes("/_sample/")) {
                const orgin_path = manifest_path.split('.json')[0] + "_origin.json";
                fs.renameSync(manifest_path, orgin_path);
                const manifest = fs.readFileSync(orgin_path, 'utf-8');
                const manifest_obj = JSON.parse(manifest);
                manifest_obj["sap.app"].id = "qa." + manifest_obj["sap.app"].id
                fs.writeFileSync(manifest_path, JSON.stringify(manifest_obj, null, 2), 'utf-8');
            }
        }
    }

    const cardManifestList = await fg(['card/**/manifest.json']);
    settingManifest(cardManifestList);

    const uiManifestList = await fg(['app/**/manifest.json'])
    settingManifest(uiManifestList);

}

qa_setting();

fs.renameSync('./card/mta.yaml', './card/mta_origin.yaml');
fs.renameSync('./app/mta.yaml', './app/mta_origin.yaml');

// mta.yaml 추출
const bix_card_mta = fs.readFileSync('./card/mta_origin.yaml', 'utf-8');
const bix_card_mta_content = yaml.parse(bix_card_mta);
const bix_app_mta = fs.readFileSync('./app/mta_origin.yaml', 'utf-8');
const bix_app_mta_content = yaml.parse(bix_app_mta);

// mta.yaml QA 구성

bix_card_mta_content.ID = bix_card_mta_content.ID + '-QA';
bix_card_mta_content.resources[0].name = "QA-" + bix_card_mta_content.resources[0].name;
bix_card_mta_content.modules[0].requires[0].name = bix_card_mta_content.resources[0].name;

bix_app_mta_content.ID = bix_app_mta_content.ID + '-QA';
bix_app_mta_content.resources[0].name = "QA-" + bix_app_mta_content.resources[0].name;
bix_app_mta_content.modules[0].requires[0].name = bix_app_mta_content.resources[0].name;

const new_bix_card_mta = yaml.stringify(bix_card_mta_content);
const new_bix_app_mta = yaml.stringify(bix_app_mta_content);

fs.writeFileSync('./card/mta.yaml', new_bix_card_mta, 'utf-8');
fs.writeFileSync('./app/mta.yaml', new_bix_app_mta, 'utf-8');