const approuter = require('@sap/approuter');
const axios = require('axios');
const http = require('http');
const xsenv = require('@sap/xsenv');
// const xssec = require("@sap/xssec");
const fs = require("fs");
const ar = approuter();

const baseUrl = process.env.BASE_URL || `http://localhost:5000`;

// // SAP BTP XSUAA 서비스 로드
// const services = xsenv.getServices({ xsuaa: { tag: "xsuaa" } });
// const xsuaaCredentials = services.xsuaa;

xsenv.loadEnv();

// ar.start();

ar.beforeRequestHandler.use("/self", function (req, res) {
  res.end(JSON.stringify({id: req.user.id, name: req.user.name}));
});

ar.start({},async ()=> {
    /*
  const options = {
        port: process.env.PORT,
        path: encodeURI("/genI18n/I18nText?$select=i18nkey,i18nProperty&sap-language=en"),
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Cookie':'*'
        }
    }
    // const httpReq = http.request(options, res => {
    //     let data = "";
    //     res.on('data', d => {
    //         data += d;
    //     });
    //     res.on('end', () => {
    //         const jsonData = JSON.parse(data);
    //         gen_i18n_files(jsonData.value, "en");
    //     });
    // });
    // httpReq.on('error', error => {
    //     console.error('startERR',error);
    // })
    // httpReq.end();

    try {
        const response = await axios.get(`${baseUrl}/i18nInit/I18nText`, {
          params: {
            $select: "i18nkey,i18nProperty",
            'sap-language': "en"
          }
        });

        gen_i18n_files(response.data.value, "en")
      } catch (error) {
        console.error("Error fetching filtered products:", error.message);
      }
    */
});



function gen_i18n_files(aI18nData, langCode) {
    let i18n = {};
    for (const reqBody of aI18nData){
        i18n[reqBody.i18nkey] = reqBody.i18nProperty;
    }
    let properties = jsonToProperties(i18n);
    fs.writeFileSync('resources/i18n/i18n_' + langCode + '.properties', properties, 'utf8');
    
}

function jsonToProperties(json, prefix = '') {
  let properties = '';

  for (const key in json) {
    if (json.hasOwnProperty(key)) {
      const value = json[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        properties += jsonToProperties(value, fullKey);
      } else {
        properties += `${fullKey}=${value}\n`;
      }
    }
  }

  return properties;
}