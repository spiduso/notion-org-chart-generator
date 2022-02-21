const levenshtein = require('fast-levenshtein');

exports.getContent = (rows) => {
    return `  
<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
<script type="text/javascript">
    google.charts.load("current", {packages:['orgchart']});
    google.charts.setOnLoadCallback(drawChart);  
    function drawChart() {
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Name');
    data.addColumn('string', 'Manager');
    data.addRows(${JSON.stringify(rows)});
    // data.setRowProperty(3, 'style', 'width:1000px;background-color:#00FF00');
    var options = {
        'allowHtml':true,
    };

    var chart = new google.visualization.OrgChart(document.getElementById('chart_div'));
    chart.draw(data, options);
    }
</script>
<div id="chart_div"></div>`;
};

exports.getValuesFromDatabase = async (notionClient, id, propertiesArr) => {
    const response = await notionClient.databases.query({
        database_id: id,
    });
    const peopleArr = [];
    if (!(propertiesArr[0] in response.results[0].properties)) {
        throw new Error(`'${propertiesArr[0]}' column is not in the database and personName is required!`);
    }
    if (!(propertiesArr[1] in response.results[0].properties)) {
        throw new Error(`'${propertiesArr[1]}' column is not in the database and relationName is required!`);
    }
    for (const people of response.results) {
        const person = { id: people.id };
        for (const property of Object.keys(people.properties)) {
            if (propertiesArr.includes(property)) {
                person[property] = getInfo(people.properties[property]);
            }
        }
        peopleArr.push(person);
    }

    return peopleArr;
};

exports.getDatabaseId = (name) => {
    if (name.includes('/')) {
        const splitByDash = name.split('/');
        return splitByDash[splitByDash.length - 1].split('?')[0];
    }

    return name;
};

exports.checkNamesandLeaders = (data, personName, relationName) => {
    // get names from name column
    const names = [];
    for (let i = 0; i < data.length; i++) {
        const person = data[i];
        if (!(personName in person) || person[personName] == null || person[personName].trim() === '') {
            data.splice(i, 1);
        } else {
            names.push(person[personName]);
        }
    }

    // check if relationName is in name column
    const notMatchedNames = [];
    const nameDict = {};
    for (const person of data) {
        // check rows with leaders only
        if (person[relationName].length !== 0) {
            // check every leader
            for (let i = 0; i < person[relationName].length; i++) {
                // if person[relationName][i] is Person object
                if (typeof person[relationName][i] === 'object') {
                    person[relationName][i] = person[relationName][i].name;
                }
                // if name already mathed before
                if (person[relationName][i] in nameDict) {
                    person[relationName][i] = nameDict[person[relationName][i]];
                } else if (!notMatchedNames.includes(person[relationName][i]) && !names.includes(person[relationName][i])) {
                    // if name is not unmatchable and name is not in name arr, then try heurestics
                    const nameToCheck = person[relationName][i];
                    const name = tryToMatch(nameToCheck, names);

                    if (name == null) {
                        // not matched, add to unmatchable
                        notMatchedNames.push(nameToCheck);
                    } else {
                        // matched, add to matchable and update
                        nameDict[nameToCheck] = name;
                        person[relationName] = name;
                    }
                }
            }
        }
    }

    return data;
};

function tryToMatch(name, names) {
    // remove diacritics
    const normalizedNotMatched = normalizeString(name);
    for (const personName of names) {
        // check names with normalize name
        if (normalizeString(personName) === normalizedNotMatched || levenshtein.get(name, personName) <= 2) {
            return personName;
        }
    }

    return null;
}

function normalizeString(str) {
    /*
        TODO: NOT PERFECT !!!
        Does not work for at least: ł,ё,й,ẚ,đ,æ,ø,ẚ
        Can be targeted manually if needed
    */
    // normalize and remove combining diacrtical marks
    let result = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // remove nicknames in quotation marks
    let fstIndex = result.indexOf('"');
    if (fstIndex > 0 && result.length > fstIndex + 1) {
        const sndIndex = result.substring(fstIndex + 1).indexOf('"');
        if (sndIndex > 0) {
            let space = ' ';
            if (result.substring(0, fstIndex).includes(' ') || result.substring(fstIndex + sndIndex + 2, result.length).includes(' ')) {
                space = '';
            }
            result = result.substring(0, fstIndex) + space + result.substring(fstIndex + sndIndex + 2, result.length);
        }
    }

    fstIndex = result.indexOf("'");
    if (fstIndex > 0 && result.length > fstIndex + 1) {
        const sndIndex = result.substring(fstIndex + 1).indexOf("'");
        if (sndIndex > 0) {
            let space = ' ';
            if (result.substring(0, fstIndex).includes(' ') || result.substring(fstIndex + sndIndex + 2, result.length).includes(' ')) {
                space = '';
            }
            result = result.substring(0, fstIndex) + space + result.substring(fstIndex + sndIndex + 2, result.length);
        }
    }

    // replace multispace with single
    result = result.replace(/\s\s+/g, ' ');

    // removes non-word-digit-whitespace-controlcode letters from ASCII
    // TODO: If needed remove whitespaces too (\t\n\r...)
    return result.replace(/[\u0021-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007e]/g, '');
}

exports.getRowsFromData = (data, name, leader, description) => {
    const rows = [];

    for (const person of data) {
        const info = [];
        if (person != null && person[name] != null) {
            // name and description
            let text;
            if (description && description.length > 0) {
                let desc = '';
                for (const col of description) {
                    if (person[col] != null) {
                        if (typeof person[col] === 'object') {
                            desc += `<div>${getDataFromObject(person[col])}</div>`;
                        } else {
                            desc += `<div>${person[col]}</div>`;
                        }
                    }
                }
                text = { v: person[name], f: `${person[name]}${desc}` };
            } else {
                text = person[name];
            }
            info.push(text);

            // leader ~ relation
            if (Array.isArray(person[leader])) {
                if (person[leader].length === 0) {
                    info.push('');
                } else {
                    let str = '';
                    for (const lead of person[leader].sort()) {
                        if (lead.name != null) {
                            str += `, ${lead.name}`;
                        } else {
                            str += `, ${lead}`;
                        }
                    }
                    info.push(str.substring(2));
                }
            } else {
                info.push(person[leader]);
            }
            rows.push(info);
        }
    }

    return rows;
};

function getDataFromObject(obj) {
    let result = '';
    if (Array.isArray(obj)) {
        for (const el of obj) {
            if (typeof el === 'object') {
                result += getDataFromObject(el);
            } else {
                result += el;
            }
            result += ', ';
        }
    } else if (typeof obj === 'object') { // dictionary
        for (const value of Object.values(obj)) {
            if (typeof value === 'object') {
                result += getDataFromObject(value);
            } else {
                result += value;
            }
            result += ', ';
        }
    }

    return result.substring(0, result.length - 2);
}

// Missing: Files and media, Advanced (Relation and basic Rollup done)
function getInfo(data) {
    let arr = [];
    switch (data.type) {
        case 'title':
            if (data.title.length !== 0) { return data.title[0].plain_text; }
            return;
        case 'rich_text':
            arr = [];
            for (const text of data.rich_text) {
                arr.push(text.text.content);
            }
            return arr;
        case 'number':
            return data.number;
        case 'select':
            return data.select.name;
        case 'multi_select':
            arr = [];
            for (const select of data.multi_select) {
                arr.push(select.name);
            }
            return arr;
        case 'date':
            return data.date;
        case 'people':
            arr = [];
            for (const personData of data.people) {
                const person = {};
                const { email, name } = personData;

                if (name) {
                    person.name = personData.name;
                }

                if (email) {
                    person.name = personData.name;
                }
                person.email = personData.person.email;
                arr.push(person);
            }
            return arr;
        case 'checkbox':
            return data.checkbox;
        case 'url':
            return data.url;
        case 'email':
            return data.email;
        case 'phone_number':
            return data.phone_number;
        case 'relation':
            arr = [];
            for (const rel of data.relation) {
                arr.push(rel);
            }
            return arr;
        case 'rollup':
            arr = [];
            for (const rollup of data.rollup.array) {
                arr.push({ [rollup.type]: getInfo(rollup) });
            }
            return arr;
        default:
            throw new Error('not implemented');
    }
}
