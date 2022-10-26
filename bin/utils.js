import chalk from 'chalk';
import fs from 'fs';
import translate from '@vitalets/google-translate-api';
import axios from 'axios';


const usage = chalk.hex('#83aaff')("\nUsage: ui5-translator <lang_name> target");


export function parseLanguages(languages) {
    if (languages.includes(",")) {
        languages = languages.split(",");
    } else {
        languages = [languages];
    }

    return languages.map((language) => {
        if (language.length == 2) {
            return language;
        }
        if (validLanguages.has(language)) {
            return validLanguages.get(language)
        }
        else {
            console.error(chalk.red.bold(`Language '${language}' not supported!`))
            return; //returning null if the language is unsupported.
        }
    }).filter((language) => !!language);


};

export function loadIntFile(filePath) {
    filePath = filePath || './webapp/i18n/i18n.properties';
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            }
            var aSourceFile = data.split(/\r?\n/);
            var aFilteredFile = aSourceFile.filter((sLine) => sLine.length > 0);
            aFilteredFile = aFilteredFile.filter((sLine) => !sLine.startsWith('#'));

            var aKeyValuePairs = aFilteredFile.map((sLine) => {
                var aLine = sLine.split("=");
                return {
                    "key": aLine[0],
                    "value": aLine[1]
                };
            });
            resolve({
                keyValueMap: aKeyValuePairs,
                sourceFile: aSourceFile
            });
        });
    });

};

export async function googleTranslateMap(aKeyValues, language) {
    return new Promise((resolve, reject) => {
        var translationPromises = aKeyValues.map((o) => translate(o.value, { to: language }));
        Promise.all(translationPromises).then((responses) => {
            var translatedMap = responses.map((response, index) => {
                return {
                    key: aKeyValues[index].key,
                    value: response.text
                };
            });
            resolve(translatedMap);
        }).catch(err => {
            reject(err);
        });
    });

}

export async function sapTranslateMap(aKeyValues, language) {
    return new Promise((resolve, reject) => {
        var aUnits = aKeyValues.map((oKeyValue) => {
            return {
                "textType": "XFLD",
                "key": oKeyValue.key,
                "value": oKeyValue.value ? oKeyValue.value : "",
                "maxLength": 35,
                "searchData": {
                    "language": "en",
                    "value": oKeyValue.value ? oKeyValue.value : "",
                }
            }
        });

        var mParameters = {
            "targetLanguages": [
                language
            ],
            "sourceLanguage": "en",
            "enableMT": true,
            "statsOnly": false,
            "minQuality": "30",
            "domain": "FI",
            "companyMLTRId": "string",
            "units": aUnits
        }

        axios.post('https://sandbox.api.sap.com/sth/translate', mParameters, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                "APIKey": "Cgz0VWInv0WLsKwRydhVY3hpYbGrbAAJ",
                "DataServiceVersion": "2.0",
                "Accept": "*/*"
            }
        }).then(({ data }) => {
            if (data.units.length > 0) {
                resolve(data.units.map((oUnit) => {
                    return {
                        key: oUnit.key,
                        value: oUnit.translations.length > 0 ? oUnit.translations.find((oTranslation) => oTranslation.language === language).value : ""
                    }
                }));
            } else {
                reject("Something went wrong!");
            }
        });

    });

}

export async function generateIntFile(aSAPTranslations, aGoogleTranslations, aSourceFile, language) {
    var aTargetFile = await getTargetFile(language);
    return aSourceFile.map((sLine) => {
        if (sLine.startsWith('#')) {
            return sLine;
        }
        if (sLine.length === 0) {
            return sLine;
        }

        var aLineItems = sLine.split("=");
        var sKey = aLineItems[0];

        var oSAPTranslation = aSAPTranslations.find((oItem) => oItem.key === sKey) || {};
        var oGoogleTranslation = aGoogleTranslations.find((oItem) => oItem.key === sKey) || {};

        if (aTargetFile.length > 0) {
            var oTargetLine = aTargetFile.find((oItem) => oItem.key === sKey);
            //Preserve original value
            if (oTargetLine && Object.keys(oTargetLine).length !== 0) {
                if (oTargetLine.hasOwnProperty("value")) {
                    return `${sKey}=${oTargetLine.value}`;
                } else {
                    return `${sKey}`;
                }

            }
        }

        if (oSAPTranslation.hasOwnProperty("value") && oSAPTranslation.value.length > 0) {
            return `${sKey}=${oSAPTranslation.value}`;
        }

        if (oGoogleTranslation.hasOwnProperty("value") && oGoogleTranslation.value.length > 0) {
            return `${sKey}=${oGoogleTranslation.value}`;
        }

        return `${sKey}=`;


    }).join("\r\n");
}

function getTargetFile(language) {
    return new Promise((resolve, reject) => {
        fs.readFile(`./webapp/i18n/i18n_${language}.properties`, 'utf8', (err, data) => {
            if (err || !data) {
                resolve([]);
            } else {
                var aKeyValuePairs = data.split(/\r?\n/).map((sLine) => {
                    if (sLine.includes("=")) {
                        var aLine = sLine.split("=");
                        return {
                            "key": aLine[0],
                            "value": aLine[1]
                        };
                    } else {
                        return {
                            "key": sLine,
                            "value": ""
                        };
                    }

                });
                resolve(aKeyValuePairs);
            }

        });
    });
}

export async function saveIntFile(string, language) {
    return new Promise(async (resolve, reject) => {

        const data = new Uint8Array(Buffer.from(string));
        fs.writeFile(`./webapp/i18n/i18n_${language}.properties`, data, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(`i18n_${language}.properties file has been generated!`);
            }
        });
    });
}




export function showAll() {
    console.log(chalk.magenta.bold("\nLanguage Name\t\tISO-639-1 Code\n"))
    for (let [key, value] of languages) {
        console.log(key + "\t\t" + value + "\n")
    }
}

export function showHelp() {
    console.log(usage);
    console.log('\nOptions:\r')
    console.log('\t--version\t      ' + 'Show version number.' + '\t\t' + '[boolean]\r')
    console.log('    -l, --languages\t' + '      ' + 'List all languages.' + '\t\t' + '[boolean]\r')
    console.log('\t--help\t\t      ' + 'Show help.' + '\t\t\t' + '[boolean]\n')
}

export function parseSentence(words) {
    var sentence = "";
    for (var i = 1; i < words.length; i++) {
        sentence = sentence + words[i] + " ";
    }
    return sentence;
}



let validLanguages = new Map();

validLanguages.set('afrikaans', 'af')
validLanguages.set('albanian', 'sq')
validLanguages.set('amharic', 'am')
validLanguages.set('arabic', 'ar')
validLanguages.set('armenian', 'hy')
validLanguages.set('azerbaijani', 'az')
validLanguages.set('basque', 'eu')
validLanguages.set('belarusian', 'be')
validLanguages.set('bengali', 'bn')
validLanguages.set('bosnian', 'bs')
validLanguages.set('bulgarian', 'bg')
validLanguages.set('catalan', 'ca')
validLanguages.set('cebuano', 'ceb') //(iso-639-2)
validLanguages.set('chinese', 'zh')	//zh-cn or zh (bcp-47)
//chinese (traditional)	zh-tw (bcp-47)
validLanguages.set('corsican', 'co')
validLanguages.set('croatian', 'hr')
validLanguages.set('czech', 'cs')
validLanguages.set('danish', 'da')
validLanguages.set('dutch', 'nl')
validLanguages.set('english', 'en')
validLanguages.set('esperanto', 'eo')
validLanguages.set('estonian', 'et')
validLanguages.set('finnish', 'fi')
validLanguages.set('french', 'fr')
validLanguages.set('frisian', 'fy')
validLanguages.set('galician', 'gl')
validLanguages.set('georgian', 'ka')
validLanguages.set('german', 'de')
validLanguages.set('greek', 'el')
validLanguages.set('gujarati', 'gu')
validLanguages.set('haitian creole', 'ht')
validLanguages.set('hausa', 'ha')
validLanguages.set('hawaiian', 'haw') // (iso-639-2)
validLanguages.set('hebrew', 'he') //or iw
validLanguages.set('hindi', 'hi')
validLanguages.set('hmong', 'hmn') //(iso-639-2)
validLanguages.set('hungarian', 'hu')
validLanguages.set('icelandic', 'is')
validLanguages.set('igbo', 'ig')
validLanguages.set('indonesian', 'id')
validLanguages.set('irish', 'ga')
validLanguages.set('italian', 'it')
validLanguages.set('japanese', 'ja')
validLanguages.set('javanese', 'jv')
validLanguages.set('kannada', 'kn')
validLanguages.set('kazakh', 'kk')
validLanguages.set('khmer', 'km')
validLanguages.set('kinyarwanda', 'rw')
validLanguages.set('korean', 'ko')
validLanguages.set('kurdish', 'ku')
validLanguages.set('kyrgyz', 'ky')
validLanguages.set('lao', 'lo')
validLanguages.set('latin', 'la')
validLanguages.set('latvian', 'lv')
validLanguages.set('lithuanian', 'lt')
validLanguages.set('luxembourgish', 'lb')
validLanguages.set('macedonian', 'mk')
validLanguages.set('malagasy', 'mg')
validLanguages.set('malay', 'ms')
validLanguages.set('malayalam', 'ml')
validLanguages.set('maltese', 'mt')
validLanguages.set('maori', 'mi')
validLanguages.set('marathi', 'mr')
validLanguages.set('mongolian', 'mn')
validLanguages.set('burmese', 'my')
validLanguages.set('nepali', 'ne')
validLanguages.set('norwegian', 'no')
validLanguages.set('nyanja', 'ny')
validLanguages.set('odia', 'or')
validLanguages.set('pashto', 'ps')
validLanguages.set('persian', 'fa')
validLanguages.set('polish', 'pl')
validLanguages.set('portuguese', 'pt')
validLanguages.set('punjabi', 'pa')
validLanguages.set('romanian', 'ro')
validLanguages.set('russian', 'ru')
validLanguages.set('samoan', 'sm')
validLanguages.set('scots', 'gd')//gd gaelic
validLanguages.set('serbian', 'sr')
validLanguages.set('sesotho', 'st')
validLanguages.set('shona', 'sn')
validLanguages.set('sindhi', 'sd')
validLanguages.set('sinhalese', 'si')
validLanguages.set('slovak', 'sk')
validLanguages.set('slovenian', 'sl')
validLanguages.set('somali', 'so')
validLanguages.set('spanish', 'es')
validLanguages.set('sundanese', 'su')
validLanguages.set('swahili', 'sw')
validLanguages.set('swedish', 'sv')
validLanguages.set('tagalog', 'tl')
validLanguages.set('tajik', 'tg')
validLanguages.set('tamil', 'ta')
validLanguages.set('tatar', 'tt')
validLanguages.set('telugu', 'te')
validLanguages.set('thai', 'th')
validLanguages.set('turkish', 'tr')
validLanguages.set('turkmen', 'tk')
validLanguages.set('ukrainian', 'uk')
validLanguages.set('urdu', 'ur')
validLanguages.set('uyghur', 'ug')
validLanguages.set('uzbek', 'uz')
validLanguages.set('vietnamese', 'vi')
validLanguages.set('welsh', 'cy')
validLanguages.set('xhosa', 'xh')
validLanguages.set('yiddish', 'yi')
validLanguages.set('yoruba', 'yo')
validLanguages.set('zulu', 'zu')