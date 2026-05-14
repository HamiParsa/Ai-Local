// chat.js
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');

let conversationHistory = [];

// Initialize conversation
function initConversation() {
    conversationHistory = [];
    addMessageToUI('assistant', 'Hello! I\'m an AI assistant. How can I help you today?');
}

// Add message to UI
function addMessageToUI(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = role === 'assistant' ? '🤖' : '👤';
    const name = role === 'assistant' ? 'Assistant:' : 'You:';
    
    messageDiv.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="content">
            <strong>${name}</strong>
            <p>${escapeHtml(content)}</p>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show status message
function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? '#dc3545' : '#6c757d';
    setTimeout(() => {
        if (statusDiv.textContent === message) {
            statusDiv.textContent = '';
        }
    }, 3000);
}

// Send message to server
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Disable input while processing
    sendBtn.disabled = true;
    messageInput.disabled = true;
    
    // Add user message to UI
    addMessageToUI('user', message);
    messageInput.value = '';
    
    // Add thinking indicator
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'message assistant';
    thinkingDiv.id = 'thinking';
    thinkingDiv.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="content">
            <strong>Assistant:</strong>
            <p>🤔 Thinking...</p>
        </div>
    `;
    chatMessages.appendChild(thinkingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        // Add user message to history
        conversationHistory.push({
            role: 'user',
            content: message
        });
        
        // Make the API call to your server
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: conversationHistory,
                model: 'assistant1', // You can change this or let user select
                temperature: 0.7,
                maxTokens: 2000
            })
        });
        
        // Remove thinking indicator
        const thinkingElement = document.getElementById('thinking');
        if (thinkingElement) thinkingElement.remove();
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract the assistant's reply (adjust based on your API response structure)
        let assistantReply = "I received your message but couldn't generate a proper response.";
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            assistantReply = data.choices[0].message.content;
        } else if (data.reply) {
            assistantReply = data.reply;
        } else if (data.response) {
            assistantReply = data.response;
        } else if (typeof data === 'string') {
            assistantReply = data;
        } else {
            console.log('Full response:', data);
            assistantReply = JSON.stringify(data);
        }
        
        // Add assistant response to history
        conversationHistory.push({
            role: 'assistant',
            content: assistantReply
        });
        
        // Keep conversation history manageable (last 20 messages)
        if (conversationHistory.length > 20) {
            conversationHistory = conversationHistory.slice(-20);
        }
        
        // Add assistant message to UI
        addMessageToUI('assistant', assistantReply);
        
    } catch (error) {
        // Remove thinking indicator
        const thinkingElement = document.getElementById('thinking');
        if (thinkingElement) thinkingElement.remove();
        
        console.error('Error:', error);
        showStatus(`Error: ${error.message}`, true);
        
        // Add error message to UI
        addMessageToUI('assistant', `Sorry, I encountered an error: ${error.message}. Please check that your server is running and GITHUB_TOKEN is set correctly.`);
    } finally {
        // Re-enable input
        sendBtn.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}

// Reset conversation
function resetConversation() {
    // Clear messages from UI except the first one
    while (chatMessages.children.length > 1) {
        chatMessages.removeChild(chatMessages.lastChild);
    }
    
    // Reset history
    conversationHistory = [];
    
    // Reset the first message
    const firstMessage = chatMessages.children[0];
    if (firstMessage) {
        firstMessage.querySelector('.content p').textContent = 'Hello! I\'m an AI assistant. How can I help you today?';
    }
    
    showStatus('Conversation reset!');
    messageInput.focus();
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
resetBtn.addEventListener('click', resetConversation);

// Send message on Enter (Shift+Enter for new line)
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Initialize
initConversation();
messageInput.focus();