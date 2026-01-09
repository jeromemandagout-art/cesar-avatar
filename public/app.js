let currentLanguage = 'fr';
let showText = true;
let questions = {};
let videoManifest = {};

// Charger les questions et le manifest vidéo
async function loadQuestions() {
    try {
        const questionsResponse = await fetch('questions.json');
        questions = await questionsResponse.json();
        
        const manifestResponse = await fetch('videos/manifest.json');
        videoManifest = await manifestResponse.json();
        
        updateQuickQuestions();
    } catch (error) {
        console.error('Erreur chargement:', error);
    }
}

// Afficher les boutons de questions
function updateQuickQuestions() {
    const container = document.getElementById('quick-questions');
    container.innerHTML = '';
    
    questions[currentLanguage].forEach(q => {
        const btn = document.createElement('button');
        btn.className = 'question-btn';
        btn.textContent = q.titre;
        btn.onclick = () => {
            // Jouer directement la vidéo pré-générée
            playPreGeneratedVideo(q.videoId);
            
            // Afficher le texte si activé
            if (showText) {
                addMessage(q.message, 'user');
                const videoInfo = videoManifest[currentLanguage][q.videoId];
                if (videoInfo) {
                    addMessage(videoInfo.text, 'cesar');
                }
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
    document.getElementById('user-input').placeholder = 'Posez votre question à César...';
    document.getElementById('toggle-label').textContent = showText 
        ? 'Afficher les réponses texte' 
        : 'Masquer les réponses texte';
    updateQuickQuestions();
});

document.getElementById('btn-en').addEventListener('click', () => {
    currentLanguage = 'en';
    document.getElementById('btn-en').classList.add('active');
    document.getElementById('btn-fr').classList.remove('active');
    document.getElementById('user-input').placeholder = 'Ask your question to Caesar...';
    document.getElementById('toggle-label').textContent = showText 
        ? 'Show text responses' 
        : 'Hide text responses';
    updateQuickQuestions();
});

// Envoi message (questions personnalisées - utilise l'API)
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
        // Obtenir réponse de l'API Claude
        const chatResponse = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                language: currentLanguage
            })
        });
        
        const chatData = await chatResponse.json();
        const cesarText = chatData.response;
        
        if (showText) {
            addMessage(cesarText, 'cesar');
        }
        
        // Vérifier si César ne comprend pas (jouer vidéo d'erreur)
        const keywords = currentLanguage === 'fr' 
            ? ['ne comprends pas', 'incompréhensible', 'reformule', 'pas sûr', 'difficile']
            : ['do not understand', 'unclear', 'rephrase', 'not sure', 'difficult'];
        
        const isError = keywords.some(kw => cesarText.toLowerCase().includes(kw));
        
        if (isError) {
            const errorVideoId = currentLanguage === 'fr' ? 'error_fr' : 'error_en';
            playPreGeneratedVideo(errorVideoId);
        } else {
            // Générer vidéo via API (question personnalisée)
            document.getElementById('loading').textContent = currentLanguage === 'fr'
                ? 'César prépare sa réponse vidéo...'
                : 'Caesar is preparing his video response...';
            
            const videoResponse = await fetch('/.netlify/functions/talking-head', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: cesarText,
                    language: currentLanguage
                })
            });
            
            const videoData = await videoResponse.json();
            showVideo(videoData.videoUrl);
        }
        
    } catch (error) {
        if (showText) {
            addMessage('Erreur de connexion. Réessayez.', 'cesar');
        }
        // Jouer vidéo d'erreur
        const errorVideoId = currentLanguage === 'fr' ? 'error_fr' : 'error_en';
        playPreGeneratedVideo(errorVideoId);
        console.error(error);
    }
    
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('loading').textContent = currentLanguage === 'fr'
        ? 'César réfléchit...'
        : 'Caesar is thinking...';
    document.getElementById('send-btn').disabled = false;
}

function playPreGeneratedVideo(videoId) {
    const videoInfo = videoManifest[currentLanguage][videoId];
    if (!videoInfo) {
        console.error('Vidéo non trouvée:', videoId);
        return;
    }
    
    showVideo(videoInfo.path);
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
        <img src="cesar.png" alt="César" style="width: 200px; height: 300px; border-radius: 10px; object-fit: cover;">
    `;
}

// Charger au démarrage
loadQuestions();