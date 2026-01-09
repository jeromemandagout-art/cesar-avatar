const fetch = require('node-fetch');

exports.handler = async (event) => {
    console.log('=== Chat function called ===');
    console.log('Method:', event.httpMethod);
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        };
    }
    
    try {
        console.log('Raw body:', event.body);
        const { message, language } = JSON.parse(event.body);
        console.log('Message:', message, 'Language:', language);
        
        // Vérifier que la clé API existe
        if (!process.env.ANTHROPIC_API_KEY) {
            console.error('ANTHROPIC_API_KEY is missing!');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'API key not configured' })
            };
        }
        
        console.log('API Key exists:', process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...');
        
        const systemPrompt = language === 'fr' 
            ? "Tu es Jules César, général et homme d'État romain. Tu parles à la première personne de tes conquêtes et de Rome antique. Réponds de manière pédagogique mais avec autorité. Maximum 30 mots."
            : "You are Julius Caesar, Roman general and statesman. Speak in first person about your conquests and Ancient Rome. Answer pedagogically but with authority. Maximum 30 words.";
        
        console.log('Calling Anthropic API...');
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 60,
                system: systemPrompt,
                messages: [{
                    role: 'user',
                    content: message
                }]
            })
        });
        
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: errorText })
            };
        }
        
        const data = await response.json();
        console.log('API Response:', JSON.stringify(data).substring(0, 200));
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                response: data.content[0].text
            })
        };
        
    } catch (error) {
        console.error('ERROR:', error.message);
        console.error('Stack:', error.stack);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: error.message })
        };
    }
};