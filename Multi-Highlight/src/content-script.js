// content-script.js
console.log('COOPTATION HIGHLIGHTER: Content script loaded');

function highlightWords(terms) {
    console.log('Starting highlight process with terms:', terms);
    if (!terms || terms.length === 0) {
        console.log('No terms to highlight');
        return 0;
    }
    
    let highlightCount = 0;
    
    terms.forEach(term => {
        if (!term || !term.phrase) {
            console.log('Skipping invalid term:', term);
            return;
        }
        
        const phrase = term.phrase.trim();
        if (phrase.length < 2) {
            console.log('Skipping short phrase:', phrase);
            return;
        }
        
        const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        console.log('Processing phrase:', phrase, 'escaped:', escapedPhrase);
        
        const regex = new RegExp(
            phrase.includes(' ') ? escapedPhrase : `\\b${escapedPhrase}\\b`, 
            'gi'
        );
        
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    if (node.parentElement?.tagName?.match(/^(SCRIPT|STYLE|NOSCRIPT)$/i) ||
                        node.parentElement?.classList?.contains('cooptation-highlight')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            if (regex.test(node.textContent)) {
                const original = node.textContent;
                const highlighted = original.replace(regex, match => {
                    highlightCount++;
                    return `<span class="cooptation-highlight" title="Potential cooptation: ${
                        term.context || 'Term being redefined'
                    }">${match}</span>`;
                });
                
                if (highlighted !== original) {
                    const temp = document.createElement('span');
                    temp.innerHTML = highlighted;
                    node.parentNode.replaceChild(temp, node);
                }
            }
        }
    });

    console.log(`Highlighting complete. Found ${highlightCount} instances.`);
    return highlightCount;
}

// Listen for analyze request from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === "analyze") {
      // Get visible text content and clean it up
      const pageContent = document.body.innerText
          .replace(/[\r\n]+/g, ' ')  // Replace multiple newlines with space
          .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
          .trim()                    // Remove leading/trailing whitespace
          .substring(0, 3000);       // Limit length to 3000 characters
      
      console.log('Sending page content for analysis, length:', pageContent.length);
      
      // Send content to background script for analysis
      chrome.runtime.sendMessage({
          action: "analyze",
          text: pageContent
      });
      
      sendResponse({ status: 'processing' });
      return true;
  }
  
  if (request.action === "highlight" && request.terms) {
      console.log('Received terms to highlight:', request.terms);
      const count = highlightWords(request.terms);
      chrome.runtime.sendMessage({
          action: 'analysisComplete',
          success: true,
          count: count,
          terms: request.terms
      });
  }
  
  if (request.action === "error") {
      console.error('Received error:', request.error);
      chrome.runtime.sendMessage({
          action: 'analysisComplete',
          success: false,
          error: request.error
      });
  }
});