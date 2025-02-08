// popup.js
console.log('Popup script starting...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    const button = document.getElementById('analyzeButton');
    const modelSelect = document.getElementById('modelSelect');
    const tempSlider = document.getElementById('tempSlider');
    const tempValue = document.getElementById('tempValue');
    const statusLog = document.getElementById('statusLog');
    
    console.log('Button element:', button);

    // Update temperature display
    tempSlider?.addEventListener('input', () => {
        const temp = (tempSlider.value / 100).toFixed(1);
        if (tempValue) tempValue.textContent = temp;
    });

    button.addEventListener('click', async () => {
        console.log('Button clicked!');
        updateStatus('Starting analysis...');
        button.disabled = true;

        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            console.log('Found active tab:', tab);

            // Inject content script if needed
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content-script.js']
                });
                console.log('Content script injected');

                await chrome.scripting.insertCSS({
                    target: { tabId: tab.id },
                    files: ['styles.css']
                });
                console.log('Styles injected');
            } catch (e) {
                console.log('Script injection note:', e);
            }

            // Send analysis request
            const message = {
                action: "analyze",
                settings: {
                    model: modelSelect?.value || "deepseek/deepseek-r1-distill-llama-70b:free",
                    temperature: (tempSlider?.value || 20) / 100
                }
            };
            
            console.log('Sending message:', message);
            const response = await chrome.tabs.sendMessage(tab.id, message);
            console.log('Got response:', response);

            if (response?.status === 'processing') {
                updateStatus('Analysis in progress...');
            }

        } catch (error) {
            console.error('Error:', error);
            updateStatus('Error: ' + error.message);
        } finally {
            button.disabled = false;
        }
    });

    // Listen for analysis completion
    chrome.runtime.onMessage.addListener((message) => {
      console.log('Received message:', message);
      if (message.action === 'analysisComplete') {
          if (message.success) {
              updateStatus(`Analysis complete! Found ${message.count} terms.`);
          } else {
              updateStatus('Error: ' + (message.error || 'Unknown error'));
          }
          button.disabled = false;
      }
  });

    function updateStatus(message) {
        console.log('Status update:', message);
        if (statusLog) {
            const timestamp = new Date().toLocaleTimeString();
            statusLog.textContent = `[${timestamp}] ${message}`;
        }
    }
});

console.log('Popup script loaded completely');
