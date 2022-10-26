# UI5 Translator
## Installing
Run the installer on the root of the UI5 Application project. 
The CLI tool will look for the i18n file on ./webapp/i18n/i18n.properties
```
npm install @facuferrer86/ui5-translator
```
## Usage
The CLI tools expects a list of target languages. 
Also the source i18n file should be english.
```
ui5-translator spanish,german,italian
```
### Note
The CLI tool looks for translations on 3 sources:
1. Previously created i18n files with already translated entries.
2. SAP Translation HUB.
3. Google Translator.
If it can't find the prior it will look it on the following source.
