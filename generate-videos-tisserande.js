require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('=== VÉRIFICATION .env ===');
console.log('DID_API_KEY:', process.env.DID_API_KEY ? process.env.DID_API_KEY.substring(0, 20) + '...' : 'MANQUANTE');
console.log('IMAGE_URL_TISSERANDE:', process.env.IMAGE_URL_TISSERANDE);
console.log('========================\n');

const DID_API_KEY = process.env.DID_API_KEY;
const IMAGE_URL = process.env.IMAGE_URL_TISSERANDE;
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

if (!DID_API_KEY || !IMAGE_URL) {
    console.error('❌ Variables manquantes dans .env');
    process.exit(1);
}

console.log('✅ Configuration OK\n');

const videos = {
    fr: [
        {
            id: 'q1_fr',
            text: "Je suis Livia Textrix, maîtresse tisserande. Je transforme la laine et le lin en tissus précieux pour les tuniques, toges et tapisseries romaines."
        },
        {
            id: 'q2_fr',
            text: "La laine vient des moutons locaux, le lin des champs d'Égypte. Je lave, carde, file puis tisse sur mon grand métier à tisser vertical."
        },
        {
            id: 'q3_fr',
            text: "J'utilise des teintures naturelles : pourpre de murex pour les riches, garance rouge, pastel bleu et safran jaune. Chaque couleur a son secret."
        },
        {
            id: 'q4_fr',
            text: "La stola brodée pour une matrone romaine demande trois mois de travail minutieux. C'est mon chef-d'œuvre, symbole d'élégance et de dignité."
        },
        {
            id: 'q5_fr',
            text: "Les matrones, les prêtresses et les familles riches commandent mes tissus. La qualité de mon tissage garantit leur statut social dans Rome."
        },
        {
            id: 'error_fr',
            text: "Je ne comprends pas ta question. Reformule ou choisis parmi les questions proposées ci-dessous."
        }
    ],
    en: [
        {
            id: 'q1_en',
            text: "I am Livia Textrix, master weaver. I transform wool and linen into precious fabrics for Roman tunics, togas and tapestries."
        },
        {
            id: 'q2_en',
            text: "Wool comes from local sheep, linen from Egyptian fields. I wash, card, spin then weave on my large vertical loom."
        },
        {
            id: 'q3_en',
            text: "I use natural dyes: murex purple for the wealthy, madder red, woad blue and saffron yellow. Each color has its secret."
        },
        {
            id: 'q4_en',
            text: "An embroidered stola for a Roman matron requires three months of meticulous work. It's my masterpiece, symbol of elegance and dignity."
        },
        {
            id: 'q5_en',
            text: "Matrons, priestesses and wealthy families order my fabrics. My weaving quality guarantees their social status in Rome."
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
                    provider: { type: 'elevenlabs', voice_id: VOICE_ID }
                },
                config: { fluent: false, pad_audio: 0, stitch: true }
            })
        });
        
        console.log('   📋 Status HTTP:', createResponse.status);
        const createData = await createResponse.json();
        console.log('   📋 Réponse D-ID:', JSON.stringify(createData, null, 2));
        
        if (!createData.id) throw new Error('Pas de talk ID');
        
        const talkId = createData.id;
        console.log(`   ⏳ ID: ${talkId} - En attente...`);
        
        let videoUrl = null;
        let attempts = 0;
        
        while (!videoUrl && attempts < 60) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const statusResponse = await fetch(`https://api.d-id.com/talks/${talkId}`, {
                headers: { 'Authorization': `Basic ${DID_API_KEY}` }
            });
            const statusData = await statusResponse.json();
            
            if (statusData.status === 'done') videoUrl = statusData.result_url;
            else if (statusData.status === 'error') throw new Error('Erreur génération');
            
            attempts++;
            process.stdout.write('.');
        }
        
        if (!videoUrl) throw new Error('Timeout');
        
        console.log(`\n   ✅ Vidéo générée`);
        const videoResponse = await fetch(videoUrl);
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        
        const outputDir = path.join(__dirname, 'public', 'personnages', 'tisserande', 'videos');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        
        fs.writeFileSync(path.join(outputDir, `${videoId}.mp4`), videoBuffer);
        console.log(`   💾 Sauvegardée: public/personnages/tisserande/videos/${videoId}.mp4`);
        
        return { id: videoId, path: `videos/${videoId}.mp4`, text: text };
    } catch (error) {
        console.error(`   ❌ Erreur: ${error.message}`);
        return null;
    }
}

async function generateAll() {
    console.log('🚀 Génération TISSERANDE...\n');
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
        path.join(__dirname, 'public', 'personnages', 'tisserande', 'videos', 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    
    console.log('\n✅ Vidéos TISSERANDE générées!');
}

generateAll();