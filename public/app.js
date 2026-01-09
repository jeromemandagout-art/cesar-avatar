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
    
    try {
        // Appel API Netlify Function
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                language: currentLanguage
            })
        });
        
        const data = await response.json();
        
        // Afficher réponse César
        addMessage(data.response, 'cesar');
        
    } catch (error) {
        addMessage('Erreur de connexion. Réessayez.', 'cesar');
        console.error(error);
    }
    
    document.getElementById('loading').classList.add('hidden');
}

function addMessage(text, sender) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}