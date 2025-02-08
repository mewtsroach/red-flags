// content-script.js
console.log('COOPTATION HIGHLIGHTER: Content script loaded');

// Store highlighted words for later reference
let highlightedWords = new Set();

function clearHighlights() {
    document.querySelectorAll('.cooptation-highlight').forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
    });
    highlightedWords.clear();
}

function highlightWords(terms) {
    console.log('Starting highlight process with terms:', terms);
    if (!terms || terms.length === 0) {
        console.log('No terms to highlight');
        return 0;
    }
    
    // Clear existing highlights
    clearHighlights();
    
    // Add new highlights
    terms.forEach(term => {
        if (!term || !term.phrase) {
            console.log('Skipping invalid term:', term);
            return;
        }
        
        const phrase = term.phrase.trim();
        if (phrase.length < 3) {
            console.log('Skipping short phrase:', phrase);
            return;
        }
        
        // Escape special regex characters but maintain word boundaries
        const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        console.log('Processing phrase:', phrase, 'escaped:', escapedPhrase);
        highlightedWords.add(phrase.toLowerCase());
        
        // For multi-word phrases, don't use word boundaries
        const regex = phrase.includes(' ') ? 
            new RegExp(escapedPhrase, 'gi') : 
            new RegExp(`\\b${escapedPhrase}\\b`, 'gi');
        console.log('Created regex:', regex);
        
        // Use TreeWalker to find text nodes
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    if (node.parentElement?.tagName?.match(/^(SCRIPT|STYLE)$/i) ||
                        node.parentElement?.classList?.contains('cooptation-highlight')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodesToReplace = [];
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (regex.test(node.textContent)) {
                console.log('Found match in:', node.textContent);
                nodesToReplace.push(node);
            }
        }

        console.log(`Found ${nodesToReplace.length} nodes to highlight for phrase:`, phrase);

        // Replace text nodes with highlighted versions
        nodesToReplace.forEach(node => {
            const highlighted = node.textContent.replace(regex, 
                match => `<span class="cooptation-highlight" title="Potential cooptation: ${term.context || 'Term being redefined'}">${match}</span>`
            );
            if (highlighted !== node.textContent) {
                const temp = document.createElement('span');
                temp.innerHTML = highlighted;
                node.parentNode.replaceChild(temp, node);
                console.log('Highlighted node:', temp.innerHTML);
            }
        });
    });

    // Report results
    const count = highlightedWords.size;
    console.log(`Highlighting complete. ${count} unique terms:`, Array.from(highlightedWords));
    return count;
}

async function analyzeForCooptation(pageContent, settings = {}) {
  console.log('analyzeForCooptation called with content length:', pageContent.length);
  
  try {
      const requestBody = {
          model: "deepseek/deepseek-r1-distill-llama-70b:free",
          messages: [
              {
                  role: "system",
                  content: "You are a JSON only bot. Analyze the following text and identify instances of language that is most likely examples of cooptation. Return a JSON array of objects with 'phrase' and 'context' fields, like: [{\"phrase\":\"term\",\"context\":\"how it's being redefined\"}]. If no examples are found, return an empty array []."
              },
              {
                  role: "user",
                  content: `Find coopted phrases in this text (first 4000 characters): ${pageContent.substring(0, 4000)}`
              }
          ],
          temperature: settings.temperature || 0.2,
          max_tokens: 500,
          response_format: { type: "json_object" }
      };

      console.log('Sending API request with body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer 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',
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'Cooptation Highlighter'
          },
          body: JSON.stringify(requestBody)
      });

      console.log('API Response Status:', response.status);
      
      const responseText = await response.text();
      console.log('Full API Response:', responseText);

      // Parse the response text manually
      const data = JSON.parse(responseText);

      // Log the entire data object
      console.log('Parsed API Response Data:', JSON.stringify(data, null, 2));

      // Extract the content from the response
      const llmResponse = data.choices?.[0]?.message?.content;
      console.log('LLM Raw Response:', llmResponse);

      if (!llmResponse) {
          console.error('No content found in API response');
          return [];
      }

      try {
          // Try to parse the LLM response
          const terms = JSON.parse(llmResponse);
          console.log('Parsed Terms:', terms);
          return terms;
      } catch (parseError) {
          console.error('Failed to parse LLM response:', parseError);
          console.error('Problematic response:', llmResponse);
          return [];
      }

  } catch (error) {
      console.error('Comprehensive Error in analyzeForCooptation:', error);
      return [];
  }
}


// Modify the message listener to log more details
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === "analyze") {
      console.log('Starting analysis process');
      // Send immediate acknowledgment
      sendResponse({ status: 'processing' });
      
      // Get page content
      const pageContent = document.body.innerText;
      console.log('Page content length:', pageContent.length);
      console.log('First 500 chars:', pageContent.substring(0, 500));
      
      // Start analysis chain
      (async () => {
          try {
              console.log('Calling analyzeForCooptation...');
              const terms = await analyzeForCooptation(pageContent, request.settings);
              console.log('Analysis complete. Terms found:', terms);
              
              if (terms && terms.length > 0) {
                  console.log('Found terms to highlight:', terms);
                  const count = highlightWords(terms);
                  console.log('Highlighting complete, count:', count);
                  chrome.runtime.sendMessage({
                      action: 'analysisComplete',
                      success: true,
                      count: count,
                      terms: terms
                  });
              } else {
                  console.log('No terms found in API response');
                  chrome.runtime.sendMessage({
                      action: 'analysisComplete',
                      success: true,
                      count: 0,
                      terms: []
                  });
              }
          } catch (error) {
              console.error('Comprehensive Error during analysis:', error);
              chrome.runtime.sendMessage({
                  action: 'analysisComplete',
                  success: false,
                  error: error.message
              });
          }
      })();
      
      return true; // Keep message channel open
  }
});
