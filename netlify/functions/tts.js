const fetch = require('node-fetch');

exports.handler = async (event) => {
    console.log('=== TTS function called ===');
    
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
        const { text, language } = JSON.parse(event.body);
        console.log('Text to convert:', text.substring(0, 50) + '...');
        
        if (!process.env.ELEVENLABS_API_KEY) {
            console.error('ELEVENLABS_API_KEY is missing!');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'ElevenLabs API key not configured' })
            };
        }
        
        // Voice ID pour César (voix masculine profonde)
        const voiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam - voix autoritaire
        
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': process.env.ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });
        
        console.log('ElevenLabs response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs Error:', errorText);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: errorText })
            };
        }
        
        // Convertir l'audio en base64
        const audioBuffer = await response.buffer();
        const audioBase64 = audioBuffer.toString('base64');
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audio: `data:audio/mpeg;base64,${audioBase64}`
            })
        };
        
    } catch (error) {
        console.error('TTS ERROR:', error.message);
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