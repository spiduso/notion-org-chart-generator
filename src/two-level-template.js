/* eslint max-len: ["error", { "ignoreStrings": true,
                    "ignoreTemplateLiterals": true }] */
exports.createContentFromTwoLevelTemplate = (data, personName, relationName,
    personDescription) => {
    // name -> index v data
    const indexDict = {};
    // leader -> [name]
    const relationDict = {};
    // [index]
    const noLeaderArr = [];

    for (let i = 0; i < data.length; i++) {
        const name = data[i][personName];
        const leader = data[i][relationName];
        indexDict[name] = i;
        if ((typeof leader === 'string' && leader !== '') || (Array.isArray(leader) && leader.length !== 0)) {
            if (!(leader in relationDict)) {
                const arr = [];
                arr.push(name);
                relationDict[leader] = arr;
            } else {
                relationDict[leader].push(name);
            }
        } else {
            noLeaderArr.push(i);
        }
    }

    let content = '<style>*{padding:0;margin:0;}ul{list-style:none;}body{margin:50px 0 100px;text-align:center;font-family:"Inter",sans-serif;}.container{padding:0 10px;margin:0 80px 0 auto;}.rectangle{position:relative;padding:20px;}.sub-level-wrapper{position:relative;width:80%;max-width:500px;margin-left:auto;}.sub-level-wrapper::before{content:"";position:absolute;top:-20px;left:-20px;width:2px;height:calc(100% - 10px);background:black;}.sub-level-wrapper li{margin-top:20px;}.sub-level{font-weight:normal;background:#f27c8d;min-width:95%;}.sub-level::before{content:"";position:absolute;top:50%;left:0;transform:translate(-100%,-50%);width:20px;height:2px;background:black;}.level-wrapper{position:relative;display:grid;grid-template-columns:repeat(3,1fr);}.level-wrapper::after{display:none;content:"";position:absolute;left:-20px;bottom:-20px;width:calc(100% + 20px);height:2px;background:black;}.level{width:70%;margin:0 auto;background:#f5cc7f;}</style><div class="container"><ul class="level-wrapper">';
    for (const noLeadIndex of noLeaderArr) {
        const leader = data[noLeadIndex];
        content += getContentForPerson(leader, data, indexDict, relationDict,
            personName, 0, personDescription);
    }

    content += resolveNotFoundLeaders(data, indexDict, relationDict,
        personName, personDescription);
    content += '</ul></div>';

    return content;
};

function getContentForPerson(person, data, indexDict, relationDict, personName,
    depth, personDescription) {
    let level = 'level';
    if (depth > 0) {
        level = 'sub-level';
    }
    let content = `<li><h3 class="${level} rectangle">${person[personName]}`;
    if (personDescription) {
        for (const desc of personDescription) {
            if (person[desc]) {
                content += `<br>${person[desc]}`;
            }
        }
    }
    content += '</h3>';

    if (person[personName] in relationDict) {
        content += '<ul class="sub-level-wrapper">';
        for (const employeeName of relationDict[person[personName]]) {
            const employee = data[indexDict[employeeName]];
            content += getContentForPerson(employee, data, indexDict,
                relationDict, personName, depth + 1, personDescription);
        }
        delete relationDict[person[personName]];
        content += '</ul>';
    }
    content += '</li>';

    return content;
}

function resolveNotFoundLeaders(data, indexDict, relationDict, personName,
    personDescription) {
    let relationKeys = Object.keys(relationDict);
    const personNames = Object.keys(indexDict);
    let nameNotFound = true;
    let content = '';
    while (relationKeys.length !== 0) {
        const firstToGet = [];

        // resolve names that can't be found first
        if (nameNotFound) {
            for (const key of relationKeys) {
                if (!personNames.includes(key)) {
                    firstToGet.push(key);
                }
            }
        }

        // then resolve names that can be found
        if (firstToGet.length === 0) {
            firstToGet.push(relationKeys[0]);
            nameNotFound = false;
        }

        // get content
        for (const nameToResolve of firstToGet) {
            if (nameNotFound) {
                content += `<li><h3 class="level rectangle">${nameToResolve}</h3>`;
                content += '<ul class="sub-level-wrapper">';
                for (const name of relationDict[nameToResolve]) {
                    const person = data[indexDict[name]];
                    content += getContentForPerson(person, data, indexDict,
                        relationDict, personName, 1, personDescription);
                }
                content += '</ul>';
                content += '</li>';
            } else {
                const person = data[indexDict[nameToResolve]];
                content += `<li><h3 class="level rectangle">${nameToResolve}`;
                if (personDescription) {
                    for (const desc of personDescription) {
                        if (person[desc]) {
                            content += `<br>${person[desc]}`;
                        }
                    }
                }
                content += '</h3>';

                content += '<ul class="sub-level-wrapper">';
                if (person[personName] in relationDict) {
                    content += getContentForPerson(person, data, indexDict,
                        relationDict, personName, 1, personDescription);
                }
                content += '</ul>';
                content += '</li>';
            }
            delete relationDict[nameToResolve];
        }

        relationKeys = Object.keys(relationDict);
    }

    return content;
}
