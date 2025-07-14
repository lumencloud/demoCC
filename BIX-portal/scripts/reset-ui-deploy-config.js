const fs = require('fs');
const fg = require('fast-glob');

async function qa_setting() {

    const settingManifest = async function (fileList) {
        for (const manifest_path of fileList) {
            if (!manifest_path.includes("/_sample/")) {
                fs.renameSync(manifest_path.split('.json')[0] + "_origin.json", manifest_path);
            }
        }
    }

    const settingLibary = async function (fileList) {
        for (const library_path of fileList) {
            if (!library_path.includes("/_sample/")) {
                fs.renameSync(library_path + "_origin", library_path);
            }
        }
    }

    const cardManifestList = await fg(['card/**/manifest.json', '!**/dist/**']);
    settingManifest(cardManifestList);

    const uiManifestList = await fg(['app/**/manifest.json', '!**/dist/**'])
    settingManifest(uiManifestList);

    const uiLibraryList = await fg(['app/**/.library', '!**/dist/**'])
    settingLibary(uiLibraryList);

}

qa_setting();

fs.renameSync('./card/mta_origin.yaml', './card/mta.yaml');
fs.renameSync('./app/mta_origin.yaml', './app/mta.yaml');