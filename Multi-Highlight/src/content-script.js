// content-script.js
const API_ENDPOINT = 'YOUR_API_ENDPOINT'; // Replace with your LLM API endpoint
const API_KEY = 'YOUR_API_KEY'; // Replace with your API key

// Listen for new page loads
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    if (request.action === "analyzeContent") {
        const pageContent = document.body.innerText;
        const words = await analyzeForCooptation(pageContent);
        highlightWords(words);
    }
});

async function analyzeForCooptation(content) {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                prompt: `Analyze the following text and return a JSON array of words or phrases that represent examples of cooptation (where terms or concepts have been appropriated or repurposed from their original meaning or context): ${content}`,
                max_tokens: 500,
                temperature: 0.3
            })
        });

        const data = await response.json();
        // Parse the LLM response to extract the array of words
        // The exact parsing will depend on your LLM's response format
        return JSON.parse(data.choices[0].text);
    } catch (error) {
        console.error('Error analyzing content:', error);
        return [];
    }
}

function highlightWords(words) {
    // Reuse the existing highlight functionality
    words.forEach((word, index) => {
        $(document.body).highlight(word, {
            className: `chrome-extension-FindManyStrings chrome-extension-FindManyStrings-style-${index % 20}`,
            wordsOnly: true,
            caseSensitive: false
        });
    });
}

// manifest.json additions:
// {
//   "permissions": [
//     "activeTab",
//     "storage",
//     "scripting",
//     "<your-api-endpoint>"
//   ],
//   "host_permissions": [
//     "<your-api-endpoint>"
//   ]
// }

// background.js additions:
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        chrome.tabs.sendMessage(tabId, {
            action: "analyzeContent"
        });
    }
});