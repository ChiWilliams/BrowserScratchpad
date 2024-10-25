/**
 * This returns a sorted list of all of the current keys in the dictionary from local storage
 */
async function getDictKeys() {
    let dict = (await browser.storage.local.get('dictionary').catch((e) => console.error(e))).dictionary;
    //console.log(`In getDictKeys, got dict: ${dict}`)
    if (!dict) {
        //console.log("in getDictKeys: did not find keys");
        //console.log(JSON.stringify(dict));
        return [];
    }
    //console.log("About to sort keys")
    sortedDictKeys = Object.keys(dict).toSorted();
    //console.log(`In getDictKeys(), keys are ${sortedDictKeys}`)
    return sortedDictKeys;
}

async function logKeyValuePair(keyValue) {
    let dict = await browser.storage.local.get('dictionary');
    if (!dict.dictionary) {
        dict = {dictionary: {}};
    }
    dict.dictionary[keyValue.key] = keyValue.value;
    console.log(`In logKeyValuePair, dictionary is ${JSON.stringify(dict.dictionary)}`);
    await browser.storage.local.set(dict);
}

async function getValueFomKey(key) {
    dict = (await browser.storage.local.get('dictionary')).dictionary
    console.log(`In getValueFromKey, with dictionary valu\n ${JSON.stringify(dict)}`);

    //console.log(JSON.stringify(dict[key]));
    return dict[key] ?? "no such key";
}

async function getTabAndKeys() {
     const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
     const keys = await getDictKeys();

     // check if the content script is injected:
     try {
         await browser.tabs.sendMessage(tab.id, { command: "ping"});
     } catch (err) {
         // if fails, then thing doesn't exist
         // so we inject it
         await browser.scripting.executeScript(
             { target: {tabId: tab.id}, files: ["/content-script/read-and-write.js"] });
     }

    console.log(`tab: ${tab}, keys: ${keys}`)
    return {tab, keys}
}

async function storeContent() {
    const {tab, keys} = await getTabAndKeys();

    let response = await browser.tabs.sendMessage(tab.id,
        {command: "copyAction", keys:keys}); 

    //console.log("We got response already?")

    // check if response is not null, and log it
    if (response) {
        logKeyValuePair(response);
    }
}

async function getContent() {
    const {tab, keys} = await getTabAndKeys();

    let key = await browser.tabs.sendMessage(tab.id,
        {command: "getKeyForRetrieval", keys:keys}
    );
    const pasteValue = await getValueFomKey(key);

    await browser.tabs.sendMessage(tab.id, { command: "addValueToClipboard", value: pasteValue})
}

//keyboard shortcuts listener
browser.commands.onCommand.addListener(async (command) => {
    if (command === "store-content") {
        storeContent();
    }

    if (command === "get-content") {
        getContent();
    }

    if (command == "print-dictionary") {
        dict = await browser.storage.local.get('dictionary');
        console.log("in print-dictionary");
        dictText = JSON.stringify(dict);
        console.log(`Dict is: \n ${dictText}`);
        keys = await getDictKeys();
        console.log(`Done with keys ${keys}`);

    }
  });

browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.removeAll();

    // Add things to the context menu!
    browser.contextMenus.create( {
        id: "add-value",
        title: "Add value",
        contexts: ["all"],
        type: "normal",
        parentId: null
    });


    browser.contextMenus.create( {
        id: "get-value",
        title: "Get value",
        contexts: ["all"],
        type: "normal",
        parentId: null
        });

    })

browser.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
        case "add-value":
            storeContent();
            break;
        case "get-value":
            getContent();
            break;
    }
})

