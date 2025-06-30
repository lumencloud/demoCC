const fs = require('fs');
const fg = require('fast-glob');
const yaml = require('yaml');

// mta.yaml 수정
// 모든 manitest.json sap.app 수정
async function qa_setting() {

    const target = [];
    const settingManifest = async function (fileList) {
        for (const manifest_path of fileList) {
            if (!manifest_path.includes("/_sample/")) {

                const manifest = fs.readFileSync(manifest_path, 'utf-8');
                const manifest_obj = JSON.parse(manifest);

                manifest_obj["sap.app"].id
            }
        }
    }

    const cardManifestList = await fg(['card/**/manifest.json']);
    settingManifest(cardManifestList);
    
    

    fs.renameSync('./card/mta.yaml', './card/mta_origin.yaml');
    fs.renameSync('./app/mta.yaml', './app/mta_origin.yaml');

    // mta.yaml 추출
    const bix_card_mta = fs.readFileSync('./card/mta_origin.yaml', 'utf-8');
    const bix_card_mta_content = yaml.parse(bix_card_mta);

    // mta.yaml 수정

    bix_card_mta_content.resources[0].name = "QA-" + bix_card_mta_content.resources[0].name;

    const new_bix_card_mta = yaml.stringify(bix_card_mta_content);

    fs.writeFileSync('./card/mta.yaml', new_bix_card_mta, 'utf-8');

}

qa_setting();