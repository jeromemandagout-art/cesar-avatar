require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('=== VÉRIFICATION .env ===');
console.log('DID_API_KEY:', process.env.DID_API_KEY ? process.env.DID_API_KEY.substring(0, 20) + '...' : 'MANQUANTE');
console.log('IMAGE_URL_BRONZIER:', process.env.IMAGE_URL_BRONZIER);
console.log('========================\n');

const DID_API_KEY = process.env.DID_API_KEY;
const IMAGE_URL = process.env.IMAGE_URL_BRONZIER;
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';

if (!DID_API_KEY) {
    console.error('❌ DID_API_KEY manquante');
    process.exit(1);
}

if (!IMAGE_URL) {
    console.error('❌ IMAGE_URL_BRONZIER manquante');
    process.exit(1);
}

console.log('✅ Configuration OK');
console.log('   Image:', IMAGE_URL);
console.log('');

const videos = {
    fr: [
        {
            id: 'q1_fr',
            text: "Je suis Sextus Aerarius, maître bronzier. Je coule le bronze en fusion pour créer des statues divines, des portraits d'empereurs et des ornements monumentaux."
        },
        {
            id: 'q2_fr',
            text: "Je mélange neuf parts de cuivre avec une part d'étain dans mon creuset. Le bronze fondu à mille degrés devient liquide doré, prêt à couler."
        },
        {
            id: 'q3_fr',
            text: "Je sculpte d'abord un modèle en cire, puis je l'enrobe d'argile. En chauffant, la cire fond et s'écoule, laissant un moule creux pour le bronze liquide."
        },
        {
            id: 'q4_fr',
            text: "Une statue impériale de trois mètres demande huit mois. Je coule par sections, assemble, puis polis et cisèle chaque détail avec patience infinie."
        },
        {
            id: 'q5_fr',
            text: "Je crée des statues de dieux pour les temples, des portraits d'empereurs pour les forums et des fontaines monumentales ornées de dauphins et tritons."
        },
        {
            id: 'error_fr',
            text: "Je ne comprends pas ta question. Reformule ou choisis parmi les questions proposées ci-dessous."
        }
    ],
    en: [
        {
            id: 'q1_en',
            text: "I am Sextus Aerarius, master bronze sculptor. I cast molten bronze to create divine statues, emperor portraits and monumental ornaments."
        },
        {
            id: 'q2_en',
            text: "I mix nine parts copper with one part tin in my crucible. Bronze melted at a thousand degrees becomes liquid gold, ready to pour."
        },
        {
            id: 'q3_en',
            text: "I first sculpt a wax model, then coat it in clay. When heated, wax melts and flows out, leaving hollow mold for liquid bronze."
        },
        {
            id: 'q4_en',
            text: "A three-meter imperial statue takes eight months. I cast in sections, assemble, then polish and chisel each detail with infinite patience."
        },
        {
            id: 'q5_en',
            text: "I create god statues for temples, emperor portraits for forums and monumental fountains adorned with dolphins and tritons."
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
        
        const outputDir = path.join(__dirname, 'public', 'personnages', 'bronzier', 'videos');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const outputPath = path.join(outputDir, `${videoId}.mp4`);
        fs.writeFileSync(outputPath, videoBuffer);
        
        console.log(`   💾 Sauvegardée: public/personnages/bronzier/videos/${videoId}.mp4`);
        
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
    console.log('🚀 Génération de toutes les vidéos BRONZIER...\n');
    
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
        path.join(__dirname, 'public', 'personnages', 'bronzier', 'videos', 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    
    console.log('\n✅ Toutes les vidéos BRONZIER ont été générées!');
}

generateAll();