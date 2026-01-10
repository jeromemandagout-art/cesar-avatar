require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('=== VÉRIFICATION .env ===');
console.log('DID_API_KEY:', process.env.DID_API_KEY ? process.env.DID_API_KEY.substring(0, 20) + '...' : 'MANQUANTE');
console.log('IMAGE_URL_VERRIER:', process.env.IMAGE_URL_VERRIER);
console.log('========================\n');

const DID_API_KEY = process.env.DID_API_KEY;
const IMAGE_URL = process.env.IMAGE_URL_VERRIER;
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';

if (!DID_API_KEY) {
    console.error('❌ DID_API_KEY manquante');
    process.exit(1);
}

if (!IMAGE_URL) {
    console.error('❌ IMAGE_URL_VERRIER manquante');
    process.exit(1);
}

console.log('✅ Configuration OK');
console.log('   Image:', IMAGE_URL);
console.log('');

const videos = {
    fr: [
        {
            id: 'q1_fr',
            text: "Je suis Quintus Vitrarius, maître verrier. Je souffle le verre en fusion pour créer des flacons, coupes et bijoux translucides comme l'eau pure."
        },
        {
            id: 'q2_fr',
            text: "Je chauffe le sable mélangé à de la soude dans mon four à mille degrés. Puis je souffle dans ma canne, façonnant le verre liquide en formes délicates."
        },
        {
            id: 'q3_fr',
            text: "J'ajoute des oxydes métalliques : cobalt pour le bleu, cuivre pour le vert, or pour le rouge rubis. Chaque couleur naît du feu et du métal."
        },
        {
            id: 'q4_fr',
            text: "Les petits flacons à parfum sont les plus délicats. Un souffle trop fort les brise, trop faible les déforme. C'est un art du contrôle parfait."
        },
        {
            id: 'q5_fr',
            text: "Le soufflage du verre vient de Syrie il y a un siècle. Cette technique révolutionnaire a transformé le verre de luxe rare en objet accessible."
        },
        {
            id: 'error_fr',
            text: "Je ne comprends pas ta question. Reformule ou choisis parmi les questions proposées ci-dessous."
        }
    ],
    en: [
        {
            id: 'q1_en',
            text: "I am Quintus Vitrarius, master glassmaker. I blow molten glass to create translucent bottles, cups and jewels like pure water."
        },
        {
            id: 'q2_en',
            text: "I heat sand mixed with soda in my thousand-degree furnace. Then I blow through my pipe, shaping liquid glass into delicate forms."
        },
        {
            id: 'q3_en',
            text: "I add metal oxides: cobalt for blue, copper for green, gold for ruby red. Each color is born from fire and metal."
        },
        {
            id: 'q4_en',
            text: "Small perfume bottles are most delicate. Too strong a breath breaks them, too weak deforms them. It's an art of perfect control."
        },
        {
            id: 'q5_en',
            text: "Glass blowing came from Syria a century ago. This revolutionary technique transformed glass from rare luxury to accessible object."
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
        
        const outputDir = path.join(__dirname, 'public', 'personnages', 'verrier', 'videos');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const outputPath = path.join(outputDir, `${videoId}.mp4`);
        fs.writeFileSync(outputPath, videoBuffer);
        
        console.log(`   💾 Sauvegardée: public/personnages/verrier/videos/${videoId}.mp4`);
        
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
    console.log('🚀 Génération de toutes les vidéos VERRIER...\n');
    
    const manifest = { fr: {}, en: {} };
    
    for (const video of videos.fr) {
        const result = await generateVideo(video.id, video.text, 'fr');
        if (result) manifest.fr[video.id] = result;
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    for (const video of videos.en) {
        const result = await generateVideo(video.id, video.text, 'en');
        if (result) manifest.en[video.id] = result;
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    fs.writeFileSync(
        path.join(__dirname, 'public', 'personnages', 'verrier', 'videos', 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    
    console.log('\n✅ Toutes les vidéos VERRIER ont été générées!');
}

generateAll();