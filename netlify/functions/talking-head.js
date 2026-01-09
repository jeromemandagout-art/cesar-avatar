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
        const { text, language, imageUrl } = JSON.parse(event.body);
        console.log('Text to convert:', text.substring(0, 50) + '...');
        
        if (!process.env.DID_API_KEY) {
            console.error('DID_API_KEY is missing!');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'D-ID API key not configured' })
            };
        }
        
        // Utiliser l'image fournie ou celle par défaut (César)
        const finalImageUrl = imageUrl || `${process.env.URL}/personnages/cesar/image.png`;
        
        const voiceId = 'pNInz6obpgDQGcFmaJgB';
        
        const response = await fetch('https://api.d-id.com/talks', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${process.env.DID_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source_url: finalImageUrl,
                script: {
                    type: 'text',
                    input: text,
                    provider: {
                        type: 'elevenlabs',
                        voice_id: voiceId
                    }
                },
                config: {
                    fluent: false,
                    pad_audio: 0,
                    stitch: true
                }
            })
        });
        
        const createData = await response.json();
        const talkId = createData.id;
        
        console.log('Video creation started:', talkId);
        
        // Polling
        let videoUrl = null;
        let attempts = 0;
        const maxAttempts = 30;
        
        while (!videoUrl && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
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