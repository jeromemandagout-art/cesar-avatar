const fetch = require('node-fetch');

exports.handler = async (event) => {
    console.log('=== Talking Head function called ===');
    
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
        
        if (!process.env.DID_API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'D-ID API key not configured' })
            };
        }
        
        // 1. Créer la vidéo parlante
        const createResponse = await fetch('https://api.d-id.com/talks', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${process.env.DID_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source_url: 'https://6960e4e68fd4d1000862a6d4--cesar-avatar.netlify.app/cesar.png', // URL de ton image César
                script: {
                    type: 'text',
                    input: text,
                    provider: {
                        type: 'elevenlabs',
                        voice_id: 'pNInz6obpgDQGcFmaJgB' // Voix ElevenLabs
                    }
                },
                config: {
                    fluent: true,
                    pad_audio: 0
                }
            })
        });
        
        const createData = await createResponse.json();
        const talkId = createData.id;
        
        console.log('Video creation started:', talkId);
        
        // 2. Attendre que la vidéo soit prête (polling)
        let videoUrl = null;
        let attempts = 0;
        const maxAttempts = 30;
        
        while (!videoUrl && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2 sec
            
            const statusResponse = await fetch(`https://api.d-id.com/talks/${talkId}`, {
                headers: {
                    'Authorization': `Basic ${process.env.DID_API_KEY}`
                }
            });
            
            const statusData = await statusResponse.json();
            console.log('Status:', statusData.status);
            
            if (statusData.status === 'done') {
                videoUrl = statusData.result_url;
            } else if (statusData.status === 'error') {
                throw new Error('Video generation failed');
            }
            
            attempts++;
        }
        
        if (!videoUrl) {
            throw new Error('Video generation timeout');
        }
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                videoUrl: videoUrl
            })
        };
        
    } catch (error) {
        console.error('Talking Head ERROR:', error.message);
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