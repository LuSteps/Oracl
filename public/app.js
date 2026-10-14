// Oracl - Frontend Application

class TarotApp {
  constructor() {
    this.selectedCards = [];
    this.maxCards = 3;
    this.currentSpread = 'three-card';
    this.readingContext = null;
    this.chatMessages = [];
    this.allCards = [];
    
    this.init();
  }

  async init() {
    try {
      this.bindEvents();
      await this.loadCards();
    } catch (error) {
      console.error('Initialization error:', error);
    }
  }

  bindEvents() {
    // Start reading button
    const startBtn = document.getElementById('start-reading');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.goToSelection());
    }

    // Spread selection
    document.querySelectorAll('.spread-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const clickedBtn = e.currentTarget;
        document.querySelectorAll('.spread-btn').forEach(b => b.classList.remove('active'));
        clickedBtn.classList.add('active');
        this.currentSpread = clickedBtn.dataset.spread;
      });
    });

    // Confirm selection
    const confirmBtn = document.getElementById('confirm-selection');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.getReading());
    }

    // New reading
    const newReadingBtn = document.getElementById('new-reading');
    if (newReadingBtn) {
      newReadingBtn.addEventListener('click', () => this.resetApp());
    }

    // Chat input - Enter key
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendChatMessage();
        }
      });
    }

    // Send chat button
    const sendChatBtn = document.getElementById('send-chat');
    if (sendChatBtn) {
      sendChatBtn.addEventListener('click', () => this.sendChatMessage());
    }
  }

  async loadCards() {
    try {
      const response = await fetch('/api/cards');
      if (!response.ok) throw new Error('Failed to load cards');
      this.allCards = await response.json();
      console.log('Loaded', this.allCards.length, 'tarot cards');
    } catch (error) {
      console.error('Failed to load cards:', error);
      this.allCards = [];
    }
  }

  goToSelection() {
    const queryInput = document.getElementById('user-query');
    const query = queryInput ? queryInput.value.trim() : '';

    if (!query) {
      alert('Please enter your question for the tarot');
      return;
    }

    // Reset selected cards when starting new selection
    this.selectedCards = [];
    // Shuffle once when entering selection screen
    this.shuffledCards = [...this.allCards].sort(() => Math.random() - 0.5);

    this.switchScreen('selection-screen');
    this.renderCardsGrid();
  }

  renderCardsGrid() {
    const grid = document.getElementById('cards-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // Use pre-shuffled cards (shuffled once when entering selection)
    const shuffled = this.shuffledCards || this.allCards;

    shuffled.forEach(card => {
      const cardEl = document.createElement('div');
      cardEl.className = 'card-back';
      cardEl.innerHTML = '🌟';
      cardEl.dataset.name = card.name;

      const isSelected = this.selectedCards.some(c => c.name === card.name);

      if (isSelected) {
        cardEl.classList.add('selected');
      }

      if (this.selectedCards.length >= this.maxCards && !isSelected) {
        cardEl.classList.add('disabled');
      }

      cardEl.addEventListener('click', () => this.toggleCardSelection(card));
      grid.appendChild(cardEl);
    });

    this.updateSelectionCount();
  }

  toggleCardSelection(card) {
    const existingIndex = this.selectedCards.findIndex(c => c.name === card.name);

    if (existingIndex > -1) {
      // Remove card if already selected
      this.selectedCards.splice(existingIndex, 1);
    } else if (this.selectedCards.length < this.maxCards) {
      // Add card if not at max
      this.selectedCards.push(card);
    }

    this.renderCardsGrid();
  }

  updateSelectionCount() {
    const countEl = document.getElementById('selected-count');
    const confirmBtn = document.getElementById('confirm-selection');
    
    if (countEl) {
      countEl.textContent = this.selectedCards.length;
    }
    
    if (confirmBtn) {
      confirmBtn.disabled = this.selectedCards.length !== this.maxCards;
      confirmBtn.style.opacity = this.selectedCards.length === this.maxCards ? '1' : '0.5';
      confirmBtn.style.cursor = this.selectedCards.length === this.maxCards ? 'pointer' : 'not-allowed';
    }
  }

  async getReading() {
    if (this.selectedCards.length !== this.maxCards) {
      alert('Please select all 3 cards');
      return;
    }

    this.switchScreen('reading-screen');

    const queryInput = document.getElementById('user-query');
    const query = queryInput ? queryInput.value.trim() : '';
    
    const readingQueryEl = document.getElementById('reading-query');
    if (readingQueryEl) {
      readingQueryEl.textContent = `"${query}"`;
    }

    // Display card positions
    this.displaySpread();

    // Get AI interpretation
    await this.fetchReading(query);
  }

  displaySpread() {
    const spreadDisplay = document.getElementById('spread-display');
    if (!spreadDisplay) return;

    const positions = this.currentSpread === 'three-card'
      ? ['Past', 'Present', 'Future']
      : ['Situation', 'Challenge', 'Advice'];

    spreadDisplay.innerHTML = this.selectedCards.map((card, index) => `
      <div class="card-position">
        <div class="position-label">${positions[index]}</div>
        <img src="/data/cards/${card.img}" alt="${card.name}" class="card-revealed" onerror="this.style.display='none';this.parentElement.innerHTML+='<div class=\'card-placeholder\'>🎴</div>'">
        <div class="card-name">${card.name}</div>
        <div class="card-keywords">${card.keywords.slice(0, 3).join(', ')}</div>
      </div>
    `).join('');
  }

  async fetchReading(query) {
    const interpretationDiv = document.getElementById('interpretation-text');
    if (!interpretationDiv) return;

    // Show loading state
    interpretationDiv.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Consulting the cards...</p>
      </div>
    `;

    try {
      const response = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards: this.selectedCards.map(c => ({ name: c.name, reversed: c.reversed || false })),
          query,
          spreadType: this.currentSpread
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate reading');
      }

      const data = await response.json();

      // Store reading context for chat
      this.readingContext = {
        query,
        cards: data.cards || this.selectedCards.map((c, i) => ({ ...c, position: i })),
        interpretation: data.interpretation
      };

      // Display interpretation with markdown-like formatting
      interpretationDiv.innerHTML = this.formatInterpretation(data.interpretation);

    } catch (error) {
      console.error('Reading error:', error);
      interpretationDiv.innerHTML = `
        <div class="error-message">
          <p>🔮 The spirits are silent at the moment.</p>
          <p><small>${error.message}</small></p>
          <p><small>Note: Make sure you've added your API key in the .env file</small></p>
        </div>
      `;
    }
  }

  formatInterpretation(text) {
    if (!text) return '<p>No interpretation available</p>';

    // Process markdown-like formatting
    let formatted = text
      // Escape HTML to prevent XSS
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold: **text** or __text__
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      // Italic: *text* or _text_
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Inline code: `text`
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Strikethrough: ~~text~~
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      // Line breaks within paragraphs (single newline)
      .replace(/\n/g, '<br>');

    // Split into paragraphs (double newline)
    return formatted
      .split(/\n\n+/)
      .filter(p => p.trim())
      .map(p => `<p>${p}</p>`)
      .join('');
  }

  async sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    
    const message = input.value.trim();

    if (!message) return;
    
    if (!this.readingContext) {
      alert('Please wait for the reading to complete first');
      return;
    }

    // Add user message to chat
    this.addChatMessage('user', message);
    input.value = '';

    // Add to chat history
    this.chatMessages.push({ role: 'user', content: message });

    // Show loading
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const loadingId = 'loading-' + Date.now();
    chatMessages.innerHTML += `
      <div class="chat-message ai" id="${loadingId}">
        <strong>🔮 Tarot AI</strong>
        <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
      </div>
    `;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.chatMessages,
          readingContext: JSON.stringify(this.readingContext)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Remove loading
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) loadingEl.remove();

      if (data.error) {
        throw new Error(data.error);
      }

      // Add AI response
      this.addChatMessage('ai', data.response);
      this.chatMessages.push({ role: 'assistant', content: data.response });

    } catch (error) {
      console.error('Chat error:', error);
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) loadingEl.remove();
      
      this.addChatMessage('ai', 'The spirits are having trouble communicating. Please check your API connection and try again.');
    }
  }

  addChatMessage(type, content) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const label = type === 'user' ? 'You' : '🔮 Tarot AI';

    chatMessages.innerHTML += `
      <div class="chat-message ${type}">
        <strong>${label}</strong>
        <div>${this.formatInterpretation(content)}</div>
      </div>
    `;

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add('active');
    }
  }

  resetApp() {
    this.selectedCards = [];
    this.shuffledCards = null;
    this.readingContext = null;
    this.chatMessages = [];

    const queryInput = document.getElementById('user-query');
    if (queryInput) queryInput.value = '';

    const interpretationDiv = document.getElementById('interpretation-text');
    if (interpretationDiv) interpretationDiv.innerHTML = '';

    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.innerHTML = '';

    this.switchScreen('welcome-screen');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.tarotApp = new TarotApp();
});
