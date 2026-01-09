let currentLanguage = 'fr';
let showText = true;
let config = {};
let videoManifest = {};

async function initAvatar(avatarConfig) {
    config = avatarConfig;
    
    try {
        // Charger la configuration du personnage
        const configResponse = await fetch(`${config.basePath}config.json`);
        const personnageConfig = await configResponse.json();
        
        // Charger le manifest des vidéos
        try {
            const manifestResponse = await fetch(`${config.basePath}videos/manifest.json`);
            videoManifest = await manifestResponse.json();
        } catch (e) {
            console.log('Pas de vidéos pré-générées pour ce personnage');
        }
        
        // Mettre à jour l'interface avec les questions du personnage
        updateQuickQuestions(personnageConfig.questions);
        
        // Stocker la config globalement
        window.personnageConfig = personnageConfig;
        
    } catch (error) {
        console.error('Erreur chargement configuration:', error);
    }
}

function updateQuickQuestions(questions) {
    const container = document.getElementById('quick-questions');
    container.innerHTML = '';
    
    questions[currentLanguage].forEach(q => {
        const btn = document.createElement('button');
        btn.className = 'question-btn';
        btn.textContent = q.titre;
        btn.onclick = () => {
            // Si vidéo pré-générée existe
            if (videoManifest[currentLanguage] && videoManifest[currentLanguage][q.videoId]) {
                playPreGeneratedVideo(q.videoId);
                
                if (showText) {
                    addMessage(q.message, 'user');
                    const videoInfo = videoManifest[currentLanguage][q.videoId];
                    if (videoInfo) {
                        addMessage(videoInfo.text, 'artisan');
                    }
                }
            } else {
                // Sinon, utiliser l'API
                document.getElementById('user-input').value = q.message;
                sendMessage();
            }
        };
        container.appendChild(btn);
    });
}

// Toggle texte
document.getElementById('toggle-text').addEventListener('change', (e) => {
    showText = e.target.checked;
    const chatBox = document.getElementById('chat-box');
    const label = document.getElementById('toggle-label');
    
    if (showText) {
        chatBox.classList.remove('hidden');
        label.textContent = currentLanguage === 'fr' 
            ? 'Afficher les réponses texte' 
            : 'Show text responses';
    } else {
        chatBox.classList.add('hidden');
        label.textContent = currentLanguage === 'fr' 
            ? 'Masquer les réponses texte' 
            : 'Hide text responses';
    }
});

// Sélection langue
document.getElementById('btn-fr').addEventListener('click', () => {
    currentLanguage = 'fr';
    document.getElementById('btn-fr').classList.add('active');
    document.getElementById('btn-en').classList.remove('active');
    document.getElementById('user-input').placeholder = `Posez votre question à ${window.personnageConfig?.nom || 'l\'artisan'}...`;
    document.getElementById('toggle-label').textContent = showText 
        ? 'Afficher les réponses texte' 
        : 'Masquer les réponses texte';
    if (window.personnageConfig) {
        updateQuickQuestions(window.personnageConfig.questions);
    }
});

document.getElementById('btn-en').addEventListener('click', () => {
    currentLanguage = 'en';
    document.getElementById('btn-en').classList.add('active');
    document.getElementById('btn-fr').classList.remove('active');
    document.getElementById('user-input').placeholder = `Ask your question to ${window.personnageConfig?.nom || 'the artisan'}...`;
    document.getElementById('toggle-label').textContent = showText 
        ? 'Show text responses' 
        : 'Hide text responses';
    if (window.personnageConfig) {
        updateQuickQuestions(window.personnageConfig.questions);
    }
});

// Envoi message
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (showText) {
        addMessage(message, 'user');
    }
    input.value = '';
    
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('send-btn').disabled = true;
    
    try {
        // Obtenir le system prompt du personnage
        const systemPrompt = window.personnageConfig.systemPrompt[currentLanguage];
        
        // Appel API Claude avec personnage spécifique
        const chatResponse = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                language: currentLanguage,
                systemPrompt: systemPrompt
            })
        });
        
        const chatData = await chatResponse.json();
        const responseText = chatData.response;
        
        if (showText) {
            addMessage(responseText, 'artisan');
        }
        
        // Vérifier si incompréhension
        const keywords = currentLanguage === 'fr' 
            ? ['ne comprends pas', 'incompréhensible', 'reformule', 'pas sûr', 'difficile']
            : ['do not understand', 'unclear', 'rephrase', 'not sure', 'difficult'];
        
        const isError = keywords.some(kw => responseText.toLowerCase().includes(kw));
        
        if (isError && videoManifest[currentLanguage] && videoManifest[currentLanguage]['error_' + currentLanguage]) {
            const errorVideoId = 'error_' + currentLanguage;
            playPreGeneratedVideo(errorVideoId);
        } else {
            // Générer vidéo via API
            document.getElementById('loading').textContent = currentLanguage === 'fr'
                ? `${window.personnageConfig?.nom || 'L\'artisan'} prépare sa réponse vidéo...`
                : `${window.personnageConfig?.nom || 'The artisan'} is preparing the video response...`;
            
            const videoResponse = await fetch('/.netlify/functions/talking-head', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: responseText,
                    language: currentLanguage,
                    imageUrl: `${window.location.origin}/personnages/${config.personnage}/image.png`
                })
            });
            
            const videoData = await videoResponse.json();
            showVideo(videoData.videoUrl);
        }
        
    } catch (error) {
        if (showText) {
            addMessage('Erreur de connexion. Réessayez.', 'artisan');
        }
        // Vidéo d'erreur si disponible
        const errorVideoId = 'error_' + currentLanguage;
        if (videoManifest[currentLanguage] && videoManifest[currentLanguage][errorVideoId]) {
            playPreGeneratedVideo(errorVideoId);
        }
        console.error(error);
    }
    
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('loading').textContent = currentLanguage === 'fr'
        ? `${window.personnageConfig?.nom || 'L\'artisan'} réfléchit...`
        : `${window.personnageConfig?.nom || 'The artisan'} is thinking...`;
    document.getElementById('send-btn').disabled = false;
}

function playPreGeneratedVideo(videoId) {
    const videoInfo = videoManifest[currentLanguage][videoId];
    if (!videoInfo) {
        console.error('Vidéo non trouvée:', videoId);
        return;
    }
    
    showVideo(`${config.basePath}${videoInfo.path}`);
}

function addMessage(text, sender) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showVideo(videoPath) {
    const avatarDiv = document.querySelector('.avatar');
    
    avatarDiv.innerHTML = `
        <video 
            autoplay 
            poster="${config.basePath}image.png"
            style="
                width: 200px; 
                height: 300px; 
                border-radius: 10px;
                object-fit: cover;
            "
            onended="resetAvatar()"
        >
            <source src="${videoPath}" type="video/mp4">
        </video>
    `;
}

function resetAvatar() {
    const avatarDiv = document.querySelector('.avatar');
    avatarDiv.innerHTML = `
        <img src="${config.basePath}image.png" alt="${window.personnageConfig?.nom || 'Personnage'}" style="width: 200px; height: 300px; border-radius: 10px; object-fit: cover;">
    `;
}