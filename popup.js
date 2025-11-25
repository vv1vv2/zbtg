document.getElementById('exportJSON').onclick = () => exportWords('json');

async function exportWords(format) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url?.includes('youdao.com')) {
        alert('Please open: https://dict.youdao.com first');
        return;
    }

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: exportWordsIntoSpecificFormat,
        args: [format]
    });
}


// Single inline function (no separate defs = no errors)
async function exportWordsIntoSpecificFormat(format) {
    async function retrieveWordsListInfo(limit) {
        const response = await fetch(`https://dict.youdao.com/wordbook/webapi/words?limit=${limit}&offset=0`, { credentials: "include" });
        const json = await response.json();
        return json;
    }

    function downloadJSON(data, filename, type) {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename; 
        a.click();
        URL.revokeObjectURL(url); // Clean memory
    }

    function detectIfHasLogined() {
        const userInfo = document.querySelector(".user-info");
        if (!userInfo) {
            alert("please login your account first before exporting your word book");
            throw Error("no account is detected");
        }
    }

    // 1. Convert an array of objects to CSV string
    function jsonToCsv(jsonArray) {
        if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
            throw new Error("jsonToCsv: input must be a non-empty array");
        }

        // Use keys of first object as header columns
        const headers = Object.keys(jsonArray[0]);

        // Escape value for CSV (handles commas, quotes, newlines)
        const escapeCsvValue = (value) => {
            if (value === null || value === undefined) return "";
            const str = String(value);
            // If contains special chars, wrap in quotes and escape quotes
            if (/[",\n\r]/.test(str)) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        // Build header row
        const headerRow = headers.map(escapeCsvValue).join(",");

        // Build data rows
        const rows = jsonArray.map(obj =>
            headers.map(key => escapeCsvValue(obj[key])).join(",")
        );

        // Join all with newlines
        return [headerRow, ...rows].join("\r\n");
    }


    try {
        detectIfHasLogined();
        const totalWordsCount = (await retrieveWordsListInfo(15)).data.total;
        const wordsList = (await retrieveWordsListInfo(totalWordsCount)).data.itemList.map(({ word, trans: meaning }) => ({ word, meaning }));
        const data = JSON.stringify(wordsList, null, 2);
        downloadJSON(data, "words.json", "application/json");
        
        const csvData = jsonToCsv(wordsList);
        downloadJSON(csvData, "words.csv", "text/csv");
    } catch (e) {
        console.log(e)
    }
}
