class Chatbot {
    constructor() {
      this.messages = [];
      this.isLoading = false;
      this.init();
    }
  
    init() {
      this.loadMessages();
      this.setupEventListeners();
    }
  
    loadMessages() {
      // Load from localStorage
      const saved = localStorage.getItem('chat_history');
      if (saved) {
        try {
          const history = JSON.parse(saved);
          history.forEach(msg => {
            this.addMessageToUI(msg.role, msg.content, false);
          });
        } catch(e) {
          console.error('Error loading history');
        }
      }
    }
  
    saveMessages() {
      const messagesToSave = this.messages.slice(-50); // Keep last 50
      localStorage.setItem('chat_history', JSON.stringify(messagesToSave));
    }
  
    addMessageToUI(role, content, save = true) {
      const container = document.getElementById('chatMessages');
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${role}`;
      
      const avatar = role === 'user' ? '👤' : '🤖';
      const name = role === 'user' ? 'You' : 'Assistant';
      
      // Format content with line breaks
      const formattedContent = content.replace(/\n/g, '<br>');
      
      messageDiv.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="content">
          <strong>${name}:</strong>
          <p>${formattedContent}</p>
        </div>
      `;
      
      container.appendChild(messageDiv);
      container.scrollTop = container.scrollHeight;
      
      if (save) {
        this.messages.push({ role, content });
        this.saveMessages();
      }
    }
  
    async sendMessage() {
      if (this.isLoading) return;
      
      const input = document.getElementById('messageInput');
      const message = input.value.trim();
      
      if (!message) return;
      
      // Add user message to UI
      this.addMessageToUI('user', message);
      input.value = '';
      
      // Show typing indicator
      this.showTypingIndicator();
      this.isLoading = true;
      this.setLoadingState(true);
      
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: this.messages.slice(-20) // Send last 20 messages for context
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Request failed');
        }
        
        const data = await response.json();
        
        // Remove typing indicator
        this.removeTypingIndicator();
        
        // Add assistant response
        this.addMessageToUI('assistant', data.reply);
        
      } catch (error) {
        console.error('Error:', error);
        this.removeTypingIndicator();
        this.addMessageToUI('assistant', `Error: ${error.message}. Please check your GitHub token or try again later.`);
      } finally {
        this.isLoading = false;
        this.setLoadingState(false);
        input.focus();
      }
    }
  
    showTypingIndicator() {
      const container = document.getElementById('chatMessages');
      const indicatorDiv = document.createElement('div');
      indicatorDiv.id = 'typingIndicator';
      indicatorDiv.className = 'message assistant';
      indicatorDiv.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="content">
          <strong>Assistant:</strong>
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
      container.appendChild(indicatorDiv);
      container.scrollTop = container.scrollHeight;
    }
  
    removeTypingIndicator() {
      const indicator = document.getElementById('typingIndicator');
      if (indicator) {
        indicator.remove();
      }
    }
  
    setLoadingState(loading) {
      const sendBtn = document.getElementById('sendBtn');
      const input = document.getElementById('messageInput');
      
      if (loading) {
        sendBtn.disabled = true;
        input.disabled = true;
        sendBtn.textContent = 'Sending...';
      } else {
        sendBtn.disabled = false;
        input.disabled = false;
        sendBtn.textContent = 'Send';
      }
    }
  
    resetChat() {
      if (confirm('Start a new conversation? All current chat history will be cleared.')) {
        this.messages = [];
        localStorage.removeItem('chat_history');
        
        // Clear UI
        const container = document.getElementById('chatMessages');
        container.innerHTML = `
          <div class="message assistant">
            <div class="avatar">🤖</div>
            <div class="content">
              <strong>Assistant:</strong>
              <p>Hello! I'm an AI assistant. How can I help you today?</p>
            </div>
          </div>
        `;
        
        document.getElementById('messageInput').focus();
      }
    }
  
    setupEventListeners() {
      const sendBtn = document.getElementById('sendBtn');
      const input = document.getElementById('messageInput');
      const resetBtn = document.getElementById('resetBtn');
      
      sendBtn.addEventListener('click', () => this.sendMessage());
      resetBtn.addEventListener('click', () => this.resetChat());
      
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
      
      // Auto-focus on load
      input.focus();
    }
  }
  
  // Initialize chatbot when page loads
  document.addEventListener('DOMContentLoaded', () => {
    window.chatbot = new Chatbot();
  });