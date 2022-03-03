# Notion Org Chart Generator
Actor creates an org chart image based on Notion people directory.

## Cost of Usage
Actor does not use any proxy. Actor use 1CU per 250 runs.

## Tutorial
1) First of all you need a Notion page with a full page database.
For this tutorial, we will use mockup data located in this link:
```
https://www.notion.so/spidoosha/8b374794e9fc490fb0ea98619eb7796a
```
2) On this page - https://www.notion.so/my-integrations - create a new integration and choose correct asscociated workspace, which corresponds to the database.
3) Go back to the Notion database page and click on `Share`, then `Invite` and under `Select an integration` choose the integration you created in the previous step. Give the integration permission `Can view`.
4) Now you are all set up! In https://console.apify.com/ create an actor and enter input viz section bellow.
5) Image of the orgchart is stored in the default key-value storage.

## Input
<hr>

### Integration token - ```integrationToken```
*Required - String*
Token of the integration to the Notion database. Token can be found in https://www.notion.so/my-integrations. Token starts with 'secret_'.
<hr>

### Database - ```database```
*Required - String*
Notion URL to the database or Database ID can be found in the url of the Notion page. For example, for https://www.notion.so/spidoosha/8b374794e9fc490fb0ea98619eb7796a, or just '8b374794e9fc490fb0ea98619eb7796a'.
<hr>

### Relation name - ```relationName```
*Required - String*<br>
Name of the column in the Notion database with which relations in the orgchart will be made. Column can be type of Person or Text.
<hr>

### Person name - ```personName```
*Required - String* <br>
Name of the column in the Notion database with name of the people.
<hr>

### Person description - ```personDescription```
*Optional - Array*
Name of the columns in the Notion database which will be added to the chart bellow the person name.
<hr>

### Type of chart - ```typeOfChart```
*Required - Enum*
Type of chart in which the data will be rendered.
- Google Charts uses template made by Google. Big charts can get too wide.
- Unformatted Nested List - Creates unformatted list.
- Formatted Two Level List - Uses formatted template with two levels. Big charts can result in big image.
<hr>

## Results
Actor stores its result in the default key-value storage with the name `org-chart`, where time is the date and time of actor run.