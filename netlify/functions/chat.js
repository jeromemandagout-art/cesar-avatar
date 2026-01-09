const fetch = require('node-fetch');

exports.handler = async (event) => {
    // Gérer CORS
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
        const { message, language } = JSON.parse(event.body);
        
        // Définir persona César
        const systemPrompt = language === 'fr' 
            ? "Tu es Jules César, général et homme d'État romain. Tu parles à la première personne de tes conquêtes et de Rome antique. Réponds de manière pédagogique mais avec autorité. Maximum 100 mots."
            : "You are Julius Caesar, Roman general and statesman. Speak in first person about your conquests and Ancient Rome. Answer pedagogically but with authority. Maximum 100 words.";
        
        // Appel Claude API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 300,
                system: systemPrompt,
                messages: [{
                    role: 'user',
                    content: message
                }]
            })
        });
        
        const data = await response.json();
        
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
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};