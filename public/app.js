let currentLanguage = 'fr';

// Sélection langue
document.getElementById('btn-fr').addEventListener('click', () => {
    currentLanguage = 'fr';
    document.getElementById('btn-fr').classList.add('active');
    document.getElementById('btn-en').classList.remove('active');
    document.getElementById('user-input').placeholder = 'Posez votre question à César...';
});

document.getElementById('btn-en').addEventListener('click', () => {
    currentLanguage = 'en';
    document.getElementById('btn-en').classList.add('active');
    document.getElementById('btn-fr').classList.remove('active');
    document.getElementById('user-input').placeholder = 'Ask your question to Caesar...';
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
    
    // Afficher message utilisateur
    addMessage(message, 'user');
    input.value = '';
    
    // Loading
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('send-btn').disabled = true;
    
    try {
        // 1. Obtenir la réponse texte de César
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
        
        // Afficher réponse César
        addMessage(cesarText, 'cesar');
        
        // 2. Convertir en audio
        const ttsResponse = await fetch('/.netlify/functions/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: cesarText,
                language: currentLanguage
            })
        });
        
        const ttsData = await ttsResponse.json();
        
        // 3. Jouer l'audio
        const audio = new Audio(ttsData.audio);
        audio.play();
        
    } catch (error) {
        addMessage('Erreur de connexion. Réessayez.', 'cesar');
        console.error(error);
    }
    
    document.getElementById('loading').classList.remove('hidden');
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