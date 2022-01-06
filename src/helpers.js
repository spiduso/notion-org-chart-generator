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

exports.getRowsFromData = (data, name, leader, description) => {
    const rows = [];

    for (const person of data) {
        const info = [];
        if (person != null && person[name] != null) {
            // name and description
            let text;
            if (description.length > 0) {
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
                text = { v: person[name], f: `${person[name].replaceAll(' ', '&nbsp;')}${desc}` };
            } else {
                text = person[name];
            }
            info.push(text);

            // leader ~ relation
            if (Array.isArray(person[leader])) {
                if (person[leader][0] == null) {
                    info.push('');
                } else if (person[leader][0].name != null) {
                    info.push(person[leader][0].name);
                } else {
                    info.push(person[leader][0]);
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
