exports.createContentFromTemplate = (data, personName, relationName, personDescription) => {
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
        if (leader !== '') {
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

    let content = '<div style="display: inline-block" class="container"><ul>';
    for (const noLeadIndex of noLeaderArr) {
        const leader = data[noLeadIndex];
        content += getContentForPerson(leader, data, indexDict, relationDict, personName, personDescription);
    }

    content += resolveNotFoundLeaders(data, indexDict, relationDict, personName, personDescription);
    content += '</ul></div>';

    return content;
};

function getContentForPerson(person, data, indexDict, relationDict, personName, personDescription) {
    let content = `<li>${person[personName]}`;
    if (personDescription) {
        for (const desc of personDescription) {
            content += `; ${person[desc]}`;
        }
    }
    if (person[personName] in relationDict) {
        content += '<ul>';
        for (const employeeName of relationDict[person[personName]]) {
            const employee = data[indexDict[employeeName]];
            content += getContentForPerson(employee, data, indexDict, relationDict, personName, personDescription);
        }
        delete relationDict[person[personName]];
        content += '</ul>';
    }
    content += '</li>';

    return content;
}

function resolveNotFoundLeaders(data, indexDict, relationDict, personName, personDescription) {
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
                content += `<li>${nameToResolve} `;

                for (const name of relationDict[nameToResolve]) {
                    content += '<ul>';
                    const person = data[indexDict[name]];
                    content += getContentForPerson(person, data, indexDict, relationDict, personName, personDescription);
                    content += '</ul>';
                }
                content += '</li>';
            } else {
                const person = data[indexDict[nameToResolve]];
                content += `<li>${nameToResolve}`;
                if (personDescription) {
                    for (const desc of personDescription) {
                        content += `; ${person[desc]}`;
                    }
                }
                if (person[personName] in relationDict) {
                    content += '<ul>';
                    content += getContentForPerson(person, data, indexDict, relationDict, personName);
                    content += '</ul>';
                }
                content += '</li>';
            }
            delete relationDict[nameToResolve];
        }

        relationKeys = Object.keys(relationDict);
    }

    return content;
}
