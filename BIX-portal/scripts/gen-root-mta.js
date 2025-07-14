const fs = require('fs');
const yaml = require('yaml');

// mta.yaml 수정
// 모든 manitest.json sap.app 수정
async function gen_mta() {

    // mta.yaml 추출
    const card_mta = fs.readFileSync('./card/mta.yaml', 'utf-8');
    const app_mta = fs.readFileSync('./app/mta.yaml', 'utf-8');
    const main_mta = fs.readFileSync('./mta.yaml', 'utf-8');

    const card_mta_content = yaml.parse(card_mta);
    const app_mta_content = yaml.parse(app_mta);
    const main_mta_content = yaml.parse(main_mta);

    // mta.yaml 수정

    for (let module of card_mta_content.modules) {
        let aRequires = [];
        // module?.["build-parameters"]?.commands?.unshift("npm install");
        if (module?.["build-parameters"]?.requires) {
            aRequires = module?.["build-parameters"]?.requires;
        }
        if (aRequires.length > 0) {
            for (let i = 0; i < module?.["build-parameters"]?.requires.length; i++) {
                let target_path = module?.["build-parameters"]?.requires[i]?.["target-path"];
                target_path = 'BIX-portal/card/' + target_path;
            }
        }
        module.path = module.path.replace('./', 'BIX-portal/card/');
    }
    for (let module of app_mta_content.modules) {
        let aRequires = [];
        // module?.["build-parameters"]?.commands?.unshift("npm install");
        if (module?.["build-parameters"]?.requires) {
            aRequires = module?.["build-parameters"]?.requires;
        }
        if (aRequires.length > 0) {
            for (let i = 0; i < module?.["build-parameters"]?.requires.length; i++) {
                let target_path = module?.["build-parameters"]?.requires[i]?.["target-path"];
                target_path = 'BIX-portal/app/' + target_path;
            }
        }
        module.path = module.path.replace('./', 'BIX-portal/app/');
    }
    for (let module of main_mta_content.modules) {
        module.path = 'BIX-portal/' + module.path;
    }

    let main_resource = main_mta_content.resources;
    for (let j = 0; j < main_resource.length; j++) {
        if (main_resource[j].name === "bix-portal-auth") {
            main_resource[j].parameters.path = main_resource[j].parameters.path.replace('./', 'BIX-portal/');
        }
    }

    const main_mta_info = main_mta_content["build-parameters"]["before-all"];
    for (let k = 0; k < main_mta_info.length; k++) {
        if (main_mta_info[k]?.commands) {
            for (let l = 0; l < main_mta_info[k].commands.length; l++) {
                main_mta_info[k].commands[l] = main_mta_info[k].commands[l].replace('./', 'BIX-portal');
            }
        }
    }

    main_mta_content.modules = [...main_mta_content.modules, ...card_mta_content.modules, ...app_mta_content.modules];
    main_mta_content.resources = [...main_mta_content.resources, ...card_mta_content.resources, ...app_mta_content.resources];

    const root_mta = yaml.stringify(main_mta_content);

    fs.writeFileSync('../mta.yaml', root_mta, 'utf-8');

}

gen_mta();