document.addEventListener("DOMContentLoaded", async () => {

    const sleep = ms => new Promise(r => setTimeout(r, ms))

    const getActiveTab = async () => {
        const tabs = await chrome.tabs.query({
            currentWindow: true,
            active: true
        })
        return tabs[0]
    }

    const showPopup = async (answer) => {
        document.getElementById('output').style.opacity = 1
        if (typeof answer === 'string') {
            document.getElementById('output').innerHTML = answer
        } else {
            document.getElementById('output').innerHTML = "Something went wrong. Please try again in a few minutes."
        }
    }

    const input = document.getElementById('input')
    const submitBtn = document.getElementById('submit-btn')
    input.contentEditable = "true"
    input.placeholder = "Paste or type your text here..."
    
    const sendMessage = () => {
        const text = input.innerText
        if (text.length > 0) {
            document.getElementById('output').style.opacity = 0.5
            document.getElementById('output').innerHTML = "Loading..."
            submitBtn.disabled = true
            const port = chrome.runtime.connect();
            port.postMessage({question: text})
            port.onMessage.addListener((msg) => {
                showPopup(msg)
                submitBtn.disabled = false
            })
        }
    }

    submitBtn.addEventListener('click', sendMessage)
    
    // Add keyboard shortcut (Enter) to submit
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    })

    // Remove or comment out getSelectedText() call if you only want manual input
    // getSelectedText()
})