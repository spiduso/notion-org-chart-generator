const Apify = require('apify');
const Notion = require('@notionhq/client');

const { Client } = Notion;
const { utils: { log } } = Apify;
const { getValuesFromDatabase, getDatabaseId, checkNamesandLeaders } = require('./helpers');
const { getContentForGoogleCharts } = require('./chart-types/google-charts-template');
const { createContentFromTemplate } = require('./chart-types/unformatted-template');
const { createContentFromTwoLevelTemplate } = require('./chart-types/two-level-template');

Apify.main(async () => {
    log.info('[CHART]: Getting input.');
    const input = await Apify.getInput();
    const {
        integrationToken,
        database,
        relationName,
        personName,
        personDescription,
        typeOfChart,
    } = input;

    const databaseId = getDatabaseId(database);

    log.info('[CHART]: Getting data from notion database.');
    const notion = new Client({ auth: integrationToken });

    let columnsToGet = [personName].concat(relationName);
    if (personDescription) {
        columnsToGet = columnsToGet.concat(personDescription);
    }

    let data = await getValuesFromDatabase(notion, databaseId, columnsToGet);
    data = checkNamesandLeaders(data, personName, relationName);
    let content = '';
    const viewPort = {
        height: 1,
    };
    if (typeOfChart == null || typeOfChart === 'googleCharts') {
        content = getContentForGoogleCharts(data, personName, relationName, personDescription);
        viewPort.deviceScaleFactor = 2;
        viewPort.width = 1;
    } else if (typeOfChart === 'unformatted') {
        content = createContentFromTemplate(data, personName, relationName, personDescription);
        viewPort.deviceScaleFactor = 2;
    } else if (typeOfChart === 'twoLevel') {
        content = createContentFromTwoLevelTemplate(data, personName, relationName, personDescription);
        viewPort.deviceScaleFactor = 0;
    } else {
        throw new Error('Type of chart is not supported');
    }

    log.info('[CHART]: Opening Puppeteer browser.');
    const browser = await Apify.launchPuppeteer();
    const page = await browser.newPage();

    log.info('[CHART]: Setting chart content.');
    await page.setContent(content, { waitUntil: 'networkidle2' });
    if (typeOfChart === 'unformatted') {
        const firstWidth = await page.evaluate(() => {
            return document.getElementsByClassName('container')[0].offsetWidth;
        });
        viewPort.width = firstWidth + 50;
    } else if (typeOfChart === 'twoLevel') {
        const firstWidth = await page.evaluate(() => {
            return document.getElementsByClassName('level-wrapper')[0].offsetWidth;
        });
        viewPort.width = firstWidth;
    }
    await page.setViewport(viewPort);
    log.info('[CHART]: Taking a screenshot.');
    const screenshot = await page.screenshot({ fullPage: true, omitBackground: true });

    log.info(`[CHART]: Storing a screenshot in default key-value store.`);
    const store = await Apify.openKeyValueStore();
    await store.setValue('org-chart', screenshot, { contentType: 'image/png' });
    log.info(store.getPublicUrl('org-chart'));
    log.info('Closing Puppeteer browser.');
    await browser.close();

    log.info('Done.');
});
