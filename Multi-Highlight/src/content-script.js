// content-script.js
const API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = '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'; // Replace with your OpenRouter API key

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
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'https://github.com/yourusername/yourrepo', // Replace with your project URL
                'X-Title': 'Multi-Highlight Extension' // Your application name
            },
            body: JSON.stringify({
                model: 'deepseek-ai/deepseek-coder-33b-instruct',
                messages: [{
                    role: 'user',
                    content: `Analyze the following text and return a JSON array of words or phrases that represent examples of cooptation (where terms or concepts have been appropriated or repurposed from their original meaning or context). Return ONLY the JSON array, nothing else: ${content}`
                }],
                temperature: 0.3
            })
        });

        const data = await response.json();
        // OpenRouter response format is different, accessing the content
        const responseText = data.choices[0].message.content;
        return JSON.parse(responseText);
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