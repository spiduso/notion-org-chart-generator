const Apify = require('apify');
const Notion = require('@notionhq/client');

const { Client } = Notion;
const { utils: { log } } = Apify;
const { getContent, getValuesFromDatabase, getRowsFromData, getDatabaseId, checkNamesandLeaders } = require('./helpers');
const { createContentFromTemplate } = require('./chart-template');
Apify.main(async () => {
    log.info('[CHART]: Getting input.');
    const input = await Apify.getInput();
    const {
        integrationToken,
        database,
        relationName,
        personName,
        personDescription,
        typeOfChart
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
        height: 1
    };
    if (typeOfChart == null || typeOfChart == 'googleCharts') {
        const readyRows = getRowsFromData(data, personName, relationName, personDescription);
        content = getContent(readyRows);
        viewPort.deviceScaleFactor = 2;
        viewPort.width = 1;
    } else if (typeOfChart == 'ownUnformatted') {
        content = createContentFromTemplate(data, personName, relationName);
        viewPort.deviceScaleFactor = 3;
    } else {
        throw new Error('Type of chart is not supported');
    }

    log.info('[CHART]: Opening Puppeteer browser.');
    const browser = await Apify.launchPuppeteer();
    const page = await browser.newPage();

    log.info('[CHART]: Setting google charts content.');
    await page.setContent(content, { waitUntil: 'networkidle2' });
    if (typeOfChart == 'ownUnformatted') {
        const width = await page.evaluate(() => {
            return document.getElementsByClassName('content')[0].offsetWidth;
        });
        viewPort.width = width + 50;
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
