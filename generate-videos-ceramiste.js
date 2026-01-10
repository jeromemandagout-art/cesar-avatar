require('dotenv').config();
const fs = require('fs');
const path = require('path');

const DID_API_KEY = process.env.DID_API_KEY;
const IMAGE_URL = process.env.IMAGE_URL_CERAMISTE;
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';

console.log('✅ Config CERAMISTE\n');

const videos = {
    fr: [
        {
            id: 'q1_fr',
            text: "Je suis Titus Figulus, potier céramiste. Je façonne l'argile rouge au tour pour créer amphores, plats et lampes qui servent toute la cité."
        },
        {
            id: 'q2_fr',
            text: "Je centre l'argile sur mon tour, puis mes mains sculptent la forme en tournant. Pour une amphore, je monte les parois hautes et étroites progressivement."
        },
        {
            id: 'q3_fr',
            text: "La sigillée est une céramique rouge brillante avec un vernis lisse comme du verre. Je plonge la pièce dans de l'argile liquide très fine avant cuisson."
        },
        {
            id: 'q4_fr',
            text: "Je cuis mes pièces dans mon four à huit cents degrés pendant deux jours. La température parfaite solidifie l'argile sans la fissurer ni la déformer."
        },
        {
            id: 'q5_fr',
            text: "Je grave des motifs géométriques, des feuilles de vigne, des dauphins ou des scènes de chasse. Chaque décor raconte une histoire ou porte bonheur."
        },
        {
            id: 'error_fr',
            text: "Je ne comprends pas ta question. Reformule ou choisis parmi les questions proposées ci-dessous."
        }
    ],
    en: [
        {
            id: 'q1_en',
            text: "I am Titus Figulus, potter ceramicist. I shape red clay on the wheel to create amphorae, dishes and lamps serving the entire city."
        },
        {
            id: 'q2_en',
            text: "I center clay on my wheel, then my hands sculpt the form while turning. For an amphora, I progressively build high narrow walls."
        },
        {
            id: 'q3_en',
            text: "Sigillata is brilliant red ceramic with glass-smooth glaze. I dip pieces in very fine liquid clay before firing."
        },
        {
            id: 'q4_en',
            text: "I fire pieces in my kiln at eight hundred degrees for two days. Perfect temperature solidifies clay without cracking or warping."
        },
        {
            id: 'q5_en',
            text: "I engrave geometric patterns, vine leaves, dolphins or hunting scenes. Each decoration tells a story or brings good fortune."
        },
        {
            id: 'error_en',
            text: "I do not understand your question. Rephrase or choose from the suggested questions below."
        }
    ]
};

async function generateVideo(videoId, text) {
    console.log(`🎬 ${videoId}...`);
    try {
        const c = await fetch('https://api.d-id.com/talks', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${DID_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_url: IMAGE_URL, script: { type: 'text', input: text, provider: { type: 'elevenlabs', voice_id: VOICE_ID } }, config: { fluent: false, pad_audio: 0, stitch: true } })
        });
        const d = await c.json();
        if (!d.id) throw new Error('No ID');
        console.log(`   ⏳ ${d.id}`);
        let u = null, i = 0;
        while (!u && i < 60) {
            await new Promise(r => setTimeout(r, 3000));
            const s = await (await fetch(`https://api.d-id.com/talks/${d.id}`, { headers: { 'Authorization': `Basic ${DID_API_KEY}` } })).json();
            if (s.status === 'done') u = s.result_url;
            i++; process.stdout.write('.');
        }
        const b = Buffer.from(await (await fetch(u)).arrayBuffer());
        const p = path.join(__dirname, 'public', 'personnages', 'ceramiste', 'videos');
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
        fs.writeFileSync(path.join(p, `${videoId}.mp4`), b);
        console.log(`\n   ✅ OK`);
        return { id: videoId, path: `videos/${videoId}.mp4`, text };
    } catch (e) {
        console.error(`   ❌ ${e.message}`);
        return null;
    }
}

async function generateAll() {
    const m = { fr: {}, en: {} };
    for (const v of videos.fr) { const r = await generateVideo(v.id, v.text); if (r) m.fr[v.id] = r; await new Promise(r => setTimeout(r, 2000)); }
    for (const v of videos.en) { const r = await generateVideo(v.id, v.text); if (r) m.en[v.id] = r; await new Promise(r => setTimeout(r, 2000)); }
    fs.writeFileSync(path.join(__dirname, 'public', 'personnages', 'ceramiste', 'videos', 'manifest.json'), JSON.stringify(m, null, 2));
    console.log('✅ CERAMISTE OK!');
}

generateAll();