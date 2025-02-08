const uid = () => {
	const generateNumber = (limit) => {
	   const value = limit * Math.random();
	   return value | 0;
	}
	const generateX = () => {
		const value = generateNumber(16);
		return value.toString(16);
	}
	const generateXes = (count) => {
		let result = '';
		for(let i = 0; i < count; ++i) {
			result += generateX();
		}
		return result;
	}
	const generateconstant = () => {
		const value = generateNumber(16);
		const constant =  (value & 0x3) | 0x8;
		return constant.toString(16);
	}
    
	const generate = () => {
  	    const result = generateXes(8)
  	         + '-' + generateXes(4)
  	         + '-' + '4' + generateXes(3)
  	         + '-' + generateconstant() + generateXes(3)
  	         + '-' + generateXes(12)
  	    return result;
	};
    return generate()
};

const getResponse = async (userText) => {
    return new Promise(async (resolve, reject) => {
        try {
            // Format the prompt with the user's text
            const formattedPrompt = `Analyze this text and identify objectively whether or not is CO-OPTATION "${userText}". Please provide a clear answer and use very simple language.`
            
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": "Bearer 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",
                    "HTTP-Referer": "",
                    "X-Title": "select-gpt",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "deepseek/deepseek-r1-distill-llama-70b:free",
                    messages: [
                        {
                            role: "user",
                            content: formattedPrompt
                        }
                    ]
                })
            })
            const data = await res.json()
            if (data.error) {
                reject(data.error.message)
            }
            resolve(data.choices[0].message.content)
        } catch (e) {
            reject("Error connecting to OpenRouter API. Please try again.")
        }
    })
}

chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener((msg) => {
        const userText = msg.question
        getResponse(userText).then(answer => {
            port.postMessage(answer)
        }).catch((e) => port.postMessage(e))
    })
})
