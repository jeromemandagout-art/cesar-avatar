let currentLanguage = 'fr';
let showText = true;
let questions = {};

// Charger les questions au démarrage
async function loadQuestions() {
    const response = await fetch('questions.json');
    questions = await response.json();
    updateQuickQuestions();
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
            document.getElementById('user-input').value = q.message;
            sendMessage();
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

// Envoi message
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Afficher message utilisateur (si texte activé)
    if (showText) {
        addMessage(message, 'user');
    }
    input.value = '';
    
    // Loading
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('send-btn').disabled = true;
    
    try {
        // 1. Obtenir la réponse texte
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
        
        // Afficher réponse César (si texte activé)
        if (showText) {
            addMessage(cesarText, 'cesar');
        }
        
        // 2. Générer vidéo parlante
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
        
        // 3. Afficher et jouer la vidéo
        showVideo(videoData.videoUrl);
        
    } catch (error) {
        if (showText) {
            addMessage('Erreur de connexion. Réessayez.', 'cesar');
        }
        console.error(error);
    }
    
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('loading').textContent = currentLanguage === 'fr'
        ? 'César réfléchit...'
        : 'Caesar is thinking...';
    document.getElementById('send-btn').disabled = false;
}

function addMessage(text, sender) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showVideo(videoUrl) {
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
            <source src="${videoUrl}" type="video/mp4">
        </video>
    `;
}

function resetAvatar() {
    const avatarDiv = document.querySelector('.avatar');
    avatarDiv.innerHTML = `
        <img src="cesar.png" alt="César" style="width: 200px; height: 300px; border-radius: 10px; object-fit: cover;">
    `;
}

// Charger les questions au démarrage
loadQuestions();