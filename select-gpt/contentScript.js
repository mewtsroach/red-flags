const returnSelection = () => {
    return new Promise((resolve, reject) => {
        if (window.getSelection) {
            resolve(window.getSelection().toString())
        } else if (document.getSelection) {
            resolve(document.getSelection().toString())
        } else if (document.selection) {
            resolve(document.selection.createRange().text.toString())
        } else reject();
    })
}

chrome.runtime.onMessage.addListener(async (request, sender, response) => {
    const { type } = request
    if (type === "LOAD") {
        try {
            const selection = await returnSelection()
            response(selection)
        } catch (e) {
            response()
        }
    }
})

let flagButton = null;

const createFloatingButton = () => {
    // Create flag button
    flagButton = document.createElement('div');
    flagButton.innerHTML = '🚩';
    flagButton.style.cssText = `
        position: fixed;
        z-index: 10000;
        cursor: pointer;
        font-size: 24px;
        filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.3));
        display: none;
    `;
    
    document.body.appendChild(flagButton);
}

const updateButtonPosition = (e) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
        flagButton.style.display = 'block';
        flagButton.style.top = `${e.pageY - 30}px`;
        flagButton.style.left = `${e.pageX}px`;
    } else {
        flagButton.style.display = 'none';
    }
}

// Initialize floating button
createFloatingButton();

// Listen for text selection
document.addEventListener('mouseup', updateButtonPosition);

// Handle flag button click
flagButton.addEventListener('click', () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
        // Open the extension popup
        chrome.runtime.sendMessage({ 
            type: "OPEN_POPUP",
            text: selectedText 
        });
    }
});