#! /usr/bin/env node

import chalk from 'chalk';
import { parseLanguages, showAll, showHelp, loadIntFile, googleTranslateMap, sapTranslateMap, generateIntFile, saveIntFile } from './utils.js';
import _yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const yargs = _yargs(hideBin(process.argv));
const usage = chalk.red("\nUsage: ui5-translator <lang_name> to be translated");
const options = yargs
    .usage(usage)
    .option("l", { alias: "languages", describe: "List all supported languages.", type: "boolean", demandOption: false })
    .help(true)
    .argv;
var bPerformTranslation = true;

if (yargs.argv.l == true || yargs.argv.languages == true) {
    showAll();
    bPerformTranslation = false;
}

if (yargs.argv._[0] == null) {
    showHelp();
    bPerformTranslation = false;
}

console.log(yargs.argv._);

if (yargs.argv._[0]) {
    var languages = yargs.argv._[0].toLowerCase(); // stores the language 
    //parsing the language specified to the ISO-639-1 code.
    languages = parseLanguages(languages);
}

//terminating the program if the language is unsupported.
if (languages.length === 0) {
    bPerformTranslation = false;
}

var oResponse = await loadIntFile() || [];

var keyValuePairs = oResponse.keyValueMap;
var aSourceFile = oResponse.sourceFile;

if (keyValuePairs.length === 0) {
    console.error(chalk.red.bold("\nThe i18n file is empty or we can't find it!\n"));
    console.log(chalk.green("Enter ui5-translator --help to get started.\n"));
    bPerformTranslation = false;
}



if (bPerformTranslation) {
    languages.forEach(async (language)=>{
        var aSAPTranslations = await sapTranslateMap(keyValuePairs, language);
        var aGoogleTranslations = await googleTranslateMap(keyValuePairs, language);
        var aTargetFile = await generateIntFile(aSAPTranslations, aGoogleTranslations, aSourceFile, language);
        var result = await saveIntFile(aTargetFile, language);
        console.log(result);
    });
    
}




