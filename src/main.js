const Apify = require('apify');
const Notion = require('@notionhq/client');

const { Client } = Notion;
const { utils: { log } } = Apify;
const { getContent, getValuesFromDatabase, getRowsFromData, getDatabaseId, checkNamesandLeaders } = require('./helpers');

Apify.main(async () => {
    log.info('[CHART]: Getting input.');
    const input = await Apify.getInput();
    const {
        integrationToken,
        database,
        relationName,
        personName,
        personDescription,
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

    const readyRows = getRowsFromData(data, personName, relationName, personDescription);
    log.info('[CHART]: Opening Puppeteer browser.');
    const browser = await Apify.launchPuppeteer();
    const page = await browser.newPage();

    log.info('[CHART]: Setting google charts content.');
    await page.setContent(getContent(readyRows), { waitUntil: 'networkidle2' });
    await page.setViewport({
        height: 1,
        width: 1,
        deviceScaleFactor: 2,
    });

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
