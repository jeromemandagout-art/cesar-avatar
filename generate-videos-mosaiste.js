require('dotenv').config();
const fs = require('fs');
const path = require('path');

// 🔍 DEBUG
console.log('=== VÉRIFICATION .env ===');
console.log('DID_API_KEY:', process.env.DID_API_KEY ? process.env.DID_API_KEY.substring(0, 20) + '...' : 'MANQUANTE');
console.log('IMAGE_URL_MOSAISTE:', process.env.IMAGE_URL_MOSAISTE);
console.log('========================\n');

const DID_API_KEY = process.env.DID_API_KEY;
const IMAGE_URL = process.env.IMAGE_URL_MOSAISTE;
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';

if (!DID_API_KEY) {
    console.error('❌ DID_API_KEY manquante');
    process.exit(1);
}

if (!IMAGE_URL) {
    console.error('❌ IMAGE_URL_MOSAISTE manquante');
    process.exit(1);
}

console.log('✅ Configuration OK');
console.log('   Image:', IMAGE_URL);
console.log('');

// Questions et réponses pré-définies MOSAÏSTE
const videos = {
    fr: [
        {
            id: 'q1_fr',
            text: "Je suis Marcus Tessellarius, maître mosaïste. Je crée des œuvres éternelles avec des milliers de petites tesselles de pierre et verre coloré."
        },
        {
            id: 'q2_fr',
            text: "D'abord je dessine le motif, puis je prépare le mortier, je taille les tesselles et je les pose une à une minutieusement."
        },
        {
            id: 'q3_fr',
            text: "Mes tesselles viennent de marbres locaux, de pierres précieuses et de verres colorés importés d'Égypte et de Syrie. Chaque couleur a sa source."
        },
        {
            id: 'q4_fr',
            text: "J'aime créer les scènes de la mythologie grecque, particulièrement Neptune et ses dauphins. Les motifs géométriques sont aussi fascinants à composer."
        },
        {
            id: 'q5_fr',
            text: "Une grande mosaïque de triclinium nécessite six à douze mois de travail avec mon équipe d'apprentis. La patience est essentielle."
        },
        {
            id: 'error_fr',
            text: "Je ne comprends pas ta question. Reformule ou choisis parmi les questions proposées ci-dessous."
        }
    ],
    en: [
        {
            id: 'q1_en',
            text: "I am Marcus Tessellarius, master mosaicist. I create eternal works with thousands of small colored stone and glass tesserae."
        },
        {
            id: 'q2_en',
            text: "First I draw the pattern, prepare mortar, cut tesserae and place them one by one meticulously."
        },
        {
            id: 'q3_en',
            text: "My tesserae come from local marbles, precious stones and colored glass imported from Egypt and Syria. Each color has its source."
        },
        {
            id: 'q4_en',
            text: "I love creating Greek mythology scenes, particularly Neptune and dolphins. Geometric patterns are also fascinating to compose."
        },
        {
            id: 'q5_en',
            text: "A large triclinium mosaic requires six to twelve months of work with my apprentice team. Patience is essential."
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
        // 🔍 AJOUT DEBUG ICI
        console.log('   📋 Status HTTP:', createResponse.status);
        
        const createData = await createResponse.json();
        
        // 🔍 AFFICHER LA RÉPONSE COMPLÈTE
        console.log('   📋 Réponse D-ID:', JSON.stringify(createData, null, 2));
        
        // Vérifier s'il y a une erreur
        if (!createData.id) {
            console.error('   ❌ Pas de talk ID dans la réponse');
            if (createData.error) {
                console.error('   ❌ Erreur D-ID:', createData.error);
            }
            throw new Error('Pas de talk ID retourné par D-ID');
        }
        
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
        const arrayBuffer = await videoResponse.arrayBuffer();
        const videoBuffer = Buffer.from(arrayBuffer);
        
        // 4. Sauvegarder localement dans le dossier MOSAISTE
        const outputDir = path.join(__dirname, 'public', 'personnages', 'mosaiste', 'videos');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const outputPath = path.join(outputDir, `${videoId}.mp4`);
        fs.writeFileSync(outputPath, videoBuffer);
        
        console.log(`   💾 Sauvegardée: public/personnages/mosaiste/videos/${videoId}.mp4`);
        
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
    console.log('🚀 Génération de toutes les vidéos MOSAÏSTE...\n');
    
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
        path.join(__dirname, 'public', 'personnages', 'mosaiste', 'videos', 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    
    console.log('\n✅ Toutes les vidéos MOSAÏSTE ont été générées!');
    console.log('📋 Manifest sauvegardé: public/personnages/mosaiste/videos/manifest.json');
}

generateAll();
