require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('=== VÉRIFICATION .env ===');
console.log('DID_API_KEY:', process.env.DID_API_KEY ? process.env.DID_API_KEY.substring(0, 20) + '...' : 'MANQUANTE');
console.log('IMAGE_URL_FRESQUISTE:', process.env.IMAGE_URL_FRESQUISTE);
console.log('========================\n');

const DID_API_KEY = process.env.DID_API_KEY;
const IMAGE_URL = process.env.IMAGE_URL_FRESQUISTE;
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';

if (!DID_API_KEY) {
    console.error('❌ DID_API_KEY manquante');
    process.exit(1);
}

if (!IMAGE_URL) {
    console.error('❌ IMAGE_URL_FRESQUISTE manquante');
    process.exit(1);
}

console.log('✅ Configuration OK');
console.log('   Image:', IMAGE_URL);
console.log('');

const videos = {
    fr: [
        {
            id: 'q1_fr',
            text: "Je suis Lucius Pictor, maître fresquiste romain. Je peins les murs des villas avec des couleurs éclatantes qui racontent des histoires mythologiques."
        },
        {
            id: 'q2_fr',
            text: "Je broie des minéraux pour créer mes pigments : ocre rouge, lapis-lazuli bleu, malachite verte. Chaque couleur vient de la terre ou de pierres précieuses."
        },
        {
            id: 'q3_fr',
            text: "Je peins sur l'enduit frais encore humide, c'est la technique al fresco. Les pigments pénètrent le mur et deviennent éternels une fois séchés."
        },
        {
            id: 'q4_fr',
            text: "J'adore peindre les dieux de l'Olympe, les jardins luxuriants et les trompe-l'œil architecturaux. Chaque fresque transforme une pièce en fenêtre sur un autre monde."
        },
        {
            id: 'q5_fr',
            text: "Décorer une grande villa demande trois à six mois. Je travaille avec mes apprentis, pièce par pièce, créant une harmonie visuelle complète."
        },
        {
            id: 'error_fr',
            text: "Je ne comprends pas ta question. Reformule ou choisis parmi les questions proposées ci-dessous."
        }
    ],
    en: [
        {
            id: 'q1_en',
            text: "I am Lucius Pictor, master Roman fresco painter. I paint villa walls with brilliant colors telling mythological stories."
        },
        {
            id: 'q2_en',
            text: "I grind minerals to create pigments: red ochre, blue lapis lazuli, green malachite. Each color comes from earth or precious stones."
        },
        {
            id: 'q3_en',
            text: "I paint on fresh wet plaster, the al fresco technique. Pigments penetrate the wall and become eternal once dried."
        },
        {
            id: 'q4_en',
            text: "I love painting Olympian gods, lush gardens and architectural trompe-l'oeil. Each fresco transforms a room into a window to another world."
        },
        {
            id: 'q5_en',
            text: "Decorating a large villa takes three to six months. I work with apprentices, room by room, creating complete visual harmony."
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
        
        const outputDir = path.join(__dirname, 'public', 'personnages', 'fresquiste', 'videos');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const outputPath = path.join(outputDir, `${videoId}.mp4`);
        fs.writeFileSync(outputPath, videoBuffer);
        
        console.log(`   💾 Sauvegardée: public/personnages/fresquiste/videos/${videoId}.mp4`);
        
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
    console.log('🚀 Génération de toutes les vidéos FRESQUISTE...\n');
    
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
        path.join(__dirname, 'public', 'personnages', 'fresquiste', 'videos', 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    
    console.log('\n✅ Toutes les vidéos FRESQUISTE ont été générées!');
}

generateAll();