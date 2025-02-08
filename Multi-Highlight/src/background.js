// background.js
const analyzeText = async (text) => {
  try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
              "Authorization": "Bearer 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",
              "HTTP-Referer": "https://localhost:3000",
              "X-Title": "Cooptation Highlighter",
              "Content-Type": "application/json"
          },
          body: JSON.stringify({
              model: "deepseek/deepseek-r1-distill-llama-70b:free",
              messages: [
                  {
                      role: "system",
                      content: "You are an AI that analyzes text for coopted language. You must ONLY respond with a valid JSON array containing objects with 'phrase' and 'context' properties. Example response: [{\"phrase\":\"example\",\"context\":\"explanation\"}]. Never include any other text or explanation in your response."
                  },
                  {
                      role: "user",
                      content: "Analyze this text and respond ONLY with a JSON array: " + text
                  }
              ],
              temperature: 0.1  // Lower temperature for more consistent formatting
          })
      });

      const data = await res.json();
      if (data.error) {
          throw new Error(data.error.message);
      }

      console.log('Raw API response:', data);
      const content = data.choices[0].message.content;
      console.log('Content from API:', content);

      // Try to extract JSON if the response includes extra text
      let jsonStr = content;
      const jsonMatch = content.match(/\[.*\]/s);
      if (jsonMatch) {
          jsonStr = jsonMatch[0];
      }

      try {
          const terms = JSON.parse(jsonStr);
          if (!Array.isArray(terms)) {
              throw new Error('Response is not an array');
          }
          
          // Validate each term has required properties
          const validTerms = terms.filter(term => 
              term && 
              typeof term === 'object' && 
              typeof term.phrase === 'string' && 
              typeof term.context === 'string'
          );

          return validTerms;
      } catch (e) {
          console.error('JSON parse error:', e);
          console.error('Attempted to parse:', jsonStr);
          throw new Error('Failed to parse response as JSON array');
      }
  } catch (e) {
      console.error('API error:', e);
      throw e;
  }
};

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyze") {
      // Log the incoming text for debugging
      console.log('Analyzing text length:', request.text.length);
      console.log('First 100 chars:', request.text.substring(0, 100));

      analyzeText(request.text)
          .then(terms => {
              console.log('Successfully parsed terms:', terms);
              chrome.tabs.sendMessage(sender.tab.id, {
                  action: "highlight",
                  terms: terms
              });
          })
          .catch(error => {
              console.error('Analysis error:', error);
              chrome.tabs.sendMessage(sender.tab.id, {
                  action: "error",
                  error: error.message
              });
          });
      return true;
  }
});