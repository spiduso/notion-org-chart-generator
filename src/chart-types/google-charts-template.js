exports.getContentForGoogleCharts = (data, personName, relationName, personDescription) => {
    return `  
<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
<script type="text/javascript">
    google.charts.load("current", {packages:['orgchart']});
    google.charts.setOnLoadCallback(drawChart);  
    function drawChart() {
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Name');
    data.addColumn('string', 'Manager');
    data.addRows(${JSON.stringify(getRowsFromData(data, personName, relationName, personDescription))});
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

function getRowsFromData(data, name, leader, description) {
    const rows = [];

    for (const person of data) {
        const info = [];
        if (person != null && person[name] != null) {
            // name and description
            let text;
            if (description && description.length > 0) {
                let desc = '';
                for (const col of description) {
                    if (person[col]) {
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
}

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
