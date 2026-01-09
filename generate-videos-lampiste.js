require('dotenv').config();
const fs = require('fs');
const path = require('path');

// 🔍 DEBUG
console.log('=== VÉRIFICATION .env ===');
console.log('DID_API_KEY:', process.env.DID_API_KEY ? process.env.DID_API_KEY.substring(0, 20) + '...' : 'MANQUANTE');
console.log('IMAGE_URL_LAMPISTE:', process.env.IMAGE_URL_LAMPISTE);
console.log('========================\n');

const DID_API_KEY = process.env.DID_API_KEY;
const IMAGE_URL = process.env.IMAGE_URL_LAMPISTE;
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';

if (!DID_API_KEY) {
    console.error('❌ DID_API_KEY manquante');
    process.exit(1);
}

if (!IMAGE_URL) {
    console.error('❌ IMAGE_URL_LAMPISTE manquante');
    process.exit(1);
}

console.log('✅ Configuration OK');
console.log('   Image:', IMAGE_URL);
console.log('');

// Questions et réponses pré-définies LAMPISTE
const videos = {
    fr: [
        {
            id: 'q1_fr',
            text: "Je suis Flavius Lucernarius, maître lampiste. Je façonne des lampes à huile en argile pour éclairer les foyers romains et les temples."
        },
        {
            id: 'q2_fr',
            text: "Je moule l'argile dans des formes, j'ajoute un bec verseur pour la mèche, je décore puis je cuis au four à haute température."
        },
        {
            id: 'q3_fr',
            text: "J'utilise de l'huile d'olive principalement. Les riches utilisent parfois des huiles parfumées. La mèche est en lin ou en papyrus tressé."
        },
        {
            id: 'q4_fr',
            text: "J'aime décorer mes lampes de scènes mythologiques, de gladiateurs ou de motifs floraux. Chaque lampe raconte une petite histoire gravée dans l'argile."
        },
        {
            id: 'q5_fr',
            text: "Mes clients sont les familles romaines, les boutiques, les thermes publics et les temples. Tout le monde a besoin de lumière après le coucher du soleil."
        },
        {
            id: 'error_fr',
            text: "Je ne comprends pas ta question. Reformule ou choisis parmi les questions proposées ci-dessous."
        }
    ],
    en: [
        {
            id: 'q1_en',
            text: "I am Flavius Lucernarius, master lamp maker. I craft oil lamps from clay to light Roman homes and temples."
        },
        {
            id: 'q2_en',
            text: "I mold clay into forms, add a spout for the wick, decorate, then fire at high temperature in my kiln."
        },
        {
            id: 'q3_en',
            text: "I mainly use olive oil. The wealthy sometimes use scented oils. The wick is made of twisted linen or papyrus."
        },
        {
            id: 'q4_en',
            text: "I love decorating my lamps with mythological scenes, gladiators or floral patterns. Each lamp tells a small story engraved in clay."
        },
        {
            id: 'q5_en',
            text: "My clients are Roman families, shops, public baths and temples. Everyone needs light after sunset in the empire."
        },
        {
            id: 'error_en',
            text: "I do not understand your question. Rephrase or choose from the suggested questions below."
        }
    ]
};

async function generateVideo(videoId, text, language) {
    console.log(`\n🎬 Génération de ${videoId}...`);
    
    try {
        const createResponse = await fetch('https://api.d-id.com/talks', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${DID_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source_url: IMAGE_URL,
                script: {
                    type: 'text',
                    input: text,
                    provider: {
                        type: 'elevenlabs',
                        voice_id: VOICE_ID
                    }
                },
                config: {
                    fluent: false,
                    pad_audio: 0,
                    stitch: true
                }
            })
        });
        
        console.log('   📋 Status HTTP:', createResponse.status);
        
        const createData = await createResponse.json();
        
        console.log('   📋 Réponse D-ID:', JSON.stringify(createData, null, 2));
        
        if (!createData.id) {
            console.error('   ❌ Pas de talk ID dans la réponse');
            if (createData.error) {
                console.error('   ❌ Erreur D-ID:', createData.error);
            }
            throw new Error('Pas de talk ID retourné par D-ID');
        }
        
        const talkId = createData.id;
        
        console.log(`   ⏳ ID: ${talkId} - En attente...`);
        
        let videoUrl = null;
        let attempts = 0;
        
        while (!videoUrl && attempts < 60) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const statusResponse = await fetch(`https://api.d-id.com/talks/${talkId}`, {
                headers: {
                    'Authorization': `Basic ${DID_API_KEY}`
                }
            });
            
            const statusData = await statusResponse.json();
            
            if (statusData.status === 'done') {
                videoUrl = statusData.result_url;
            } else if (statusData.status === 'error') {
                throw new Error(`Erreur: ${JSON.stringify(statusData)}`);
            }
            
            attempts++;
            process.stdout.write('.');
        }
        
        if (!videoUrl) {
            throw new Error('Timeout');
        }
        
        console.log(`\n   ✅ Vidéo générée: ${videoUrl}`);
        
        console.log(`   ⬇️  Téléchargement...`);
        const videoResponse = await fetch(videoUrl);
        const arrayBuffer = await videoResponse.arrayBuffer();
        const videoBuffer = Buffer.from(arrayBuffer);
        
        const outputDir = path.join(__dirname, 'public', 'personnages', 'lampiste', 'videos');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const outputPath = path.join(outputDir, `${videoId}.mp4`);
        fs.writeFileSync(outputPath, videoBuffer);
        
        console.log(`   💾 Sauvegardée: public/personnages/lampiste/videos/${videoId}.mp4`);
        
        return {
            id: videoId,
            path: `videos/${videoId}.mp4`,
            text: text
        };
        
    } catch (error) {
        console.error(`   ❌ Erreur pour ${videoId}:`, error.message);
        return null;
    }
}

async function generateAll() {
    console.log('🚀 Génération de toutes les vidéos LAMPISTE...\n');
    
    const manifest = {
        fr: {},
        en: {}
    };
    
    for (const video of videos.fr) {
        const result = await generateVideo(video.id, video.text, 'fr');
        if (result) {
            manifest.fr[video.id] = result;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    for (const video of videos.en) {
        const result = await generateVideo(video.id, video.text, 'en');
        if (result) {
            manifest.en[video.id] = result;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    fs.writeFileSync(
        path.join(__dirname, 'public', 'personnages', 'lampiste', 'videos', 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    
    console.log('\n✅ Toutes les vidéos LAMPISTE ont été générées!');
    console.log('📋 Manifest sauvegardé: public/personnages/lampiste/videos/manifest.json');
}

generateAll();