require('dotenv').config();
const fs = require('fs');
const path = require('path');

// ⚠️ Remplace par ta vraie clé D-ID
const DID_API_KEY = process.env.DID_API_KEY;
const IMAGE_URL = process.env.IMAGE_URL
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Voix ElevenLabs Adam

// Questions et réponses pré-définies
const videos = {
    fr: [
        {
            id: 'q1_fr',
            text: "Je suis Jules César, général romain et conquérant de la Gaule. J'ai étendu l'empire romain jusqu'aux confins du monde connu."
        },
        {
            id: 'q2_fr',
            text: "Mes plus grandes conquêtes incluent la Gaule, où j'ai vaincu Vercingétorix, et mes campagnes en Bretagne et Germanie qui ont agrandi Rome."
        },
        {
            id: 'q3_fr',
            text: "La conquête de la Gaule fut mon œuvre la plus remarquable. En huit ans, j'ai soumis les tribus gauloises et étendu la République."
        },
        {
            id: 'q4_fr',
            text: "Rome était le centre du monde civilisé. Les citoyens jouissaient des thermes, du forum et des spectacles du Circus Maximus quotidiennement."
        },
        {
            id: 'q5_fr',
            text: "Mon héritage est le calendrier julien, mes écrits militaires et l'expansion de Rome qui perdure dans la culture occidentale moderne."
        },
        {
            id: 'error_fr',
            text: "Je ne comprends pas ta question. Reformule ou choisis parmi les questions proposées ci-dessous."
        }
    ],
    en: [
        {
            id: 'q1_en',
            text: "I am Julius Caesar, Roman general and conqueror of Gaul. I expanded the Roman empire to the edges of the known world."
        },
        {
            id: 'q2_en',
            text: "My greatest conquests include Gaul, where I defeated Vercingetorix, and my campaigns in Britain and Germania that expanded Rome's reach."
        },
        {
            id: 'q3_en',
            text: "The conquest of Gaul was my most remarkable achievement. In eight years, I subdued the Gallic tribes and extended the Republic."
        },
        {
            id: 'q4_en',
            text: "Rome was the center of the civilized world. Citizens enjoyed baths, the forum, and Circus Maximus spectacles daily."
        },
        {
            id: 'q5_en',
            text: "My legacy is the Julian calendar, my military writings, and Rome's expansion that endures in modern Western culture."
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
        // 1. Créer la vidéo
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
        
        const createData = await createResponse.json();
        const talkId = createData.id;
        
        console.log(`   ⏳ ID: ${talkId} - En attente...`);
        
        // 2. Attendre que la vidéo soit prête
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
        
        // 3. Télécharger la vidéo
        console.log(`   ⬇️  Téléchargement...`);
        const videoResponse = await fetch(videoUrl);
        const arrayBuffer = await videoResponse.arrayBuffer(); // ✅ Changé
        const videoBuffer = Buffer.from(arrayBuffer); // ✅ Convertir en Buffer

        // 4. Sauvegarder localement
        const outputDir = path.join(__dirname, 'public', 'videos');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, `${videoId}.mp4`);
        fs.writeFileSync(outputPath, videoBuffer);
        
        console.log(`   💾 Sauvegardée: public/videos/${videoId}.mp4`);
        
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
    console.log('🚀 Génération de toutes les vidéos...\n');
    
    const manifest = {
        fr: {},
        en: {}
    };
    
    // Générer vidéos françaises
    for (const video of videos.fr) {
        const result = await generateVideo(video.id, video.text, 'fr');
        if (result) {
            manifest.fr[video.id] = result;
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Pause entre requêtes
    }
    
    // Générer vidéos anglaises
    for (const video of videos.en) {
        const result = await generateVideo(video.id, video.text, 'en');
        if (result) {
            manifest.en[video.id] = result;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Sauvegarder le manifest
    fs.writeFileSync(
        path.join(__dirname, 'public', 'videos', 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    
    console.log('\n✅ Toutes les vidéos ont été générées!');
    console.log('📋 Manifest sauvegardé: public/videos/manifest.json');
}

generateAll();