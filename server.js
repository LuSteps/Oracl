require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/data', express.static('data'));

// Initialize Qwen API client (Model Studio uses OpenAI-compatible API)
const client = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: process.env.QWEN_API_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// Load tarot card data
const tarotData = require('./data/tarot-images.json');

// Helper function to get card by image name
function getCardByImage(imgName) {
  return tarotData.cards.find(card => card.img === imgName);
}

// Helper function to get card by name
function getCardByName(name) {
  return tarotData.cards.find(card => card.name === name);
}

// API: Get all tarot cards
app.get('/api/cards', (req, res) => {
  res.json(tarotData.cards);
});

// API: Get single card by name
app.get('/api/cards/:name', (req, res) => {
  const card = getCardByName(decodeURIComponent(req.params.name));
  if (card) {
    res.json(card);
  } else {
    res.status(404).json({ error: 'Card not found' });
  }
});

// API: Get AI reading interpretation
app.post('/api/reading', async (req, res) => {
  try {
    const { cards, query, spreadType } = req.body;

    // Build concise card information for the prompt (only drawn cards, trimmed)
    const cardsInfoObjects = cards.map((card, index) => {
      const cardData = getCardByName(card.name);
      const position = spreadType === 'three-card'
        ? (index === 0 ? 'Past' : index === 1 ? 'Present' : 'Future')
        : (index === 0 ? 'Situation' : index === 1 ? 'Challenge' : 'Advice');

      // Select only the essential fields and trim long arrays to save tokens
      const minimal = {
        name: cardData.name,
        arcana: cardData.arcana,
        keywords: (cardData.keywords || []).slice(0, 6),
        fortune_telling: (cardData.fortune_telling || []).slice(0, 3),
        meanings: {
          light: (cardData.meanings && cardData.meanings.light ? cardData.meanings.light : []).slice(0, 3),
          shadow: (cardData.meanings && cardData.meanings.shadow ? cardData.meanings.shadow : []).slice(0, 2),
        },
        Elemental: cardData.Elemental || null,
        questions: (cardData['Questions to Ask'] || []).slice(0, 3),
        position,
        reversed: !!card.reversed,
      };

      return minimal;
    });

    // Convert concise objects to a compact text block for the LLM
    const cardsInfo = cardsInfoObjects.map(ci => {
      return `${ci.position}: ${ci.name} (${ci.arcana})\n- Keywords: ${ci.keywords.join(', ')}\n- Fortune Telling: ${ci.fortune_telling.join('; ')}\n- Light Meanings: ${ci.meanings.light.join('; ')}\n- Shadow Meanings: ${ci.meanings.shadow.join('; ')}\n- Element: ${ci.Elemental || 'N/A'}\n- Questions to Ask: ${ci.questions.length ? ci.questions.join('; ') : 'N/A'}`;
    }).join('\n\n');

    const systemPrompt = `You are a wise, empathetic, and insightful tarot reader. You provide meaningful, nuanced interpretations of tarot cards while encouraging self-reflection and personal growth. You speak in a warm, mystical tone but remain grounded and practical. You never make absolute predictions about health, legal matters, or death. Instead, you guide the querent toward understanding their situation better and making empowered choices.

When interpreting cards:
- Consider the traditional meanings and symbolism
- Connect the cards to each other to tell a cohesive story
- Relate interpretations to the querent's specific question
- Balance positive and challenging aspects
- End with actionable guidance or questions for reflection`;

    const userQueryText = query || "General guidance";
    const userPrompt = `The querent asks: "${userQueryText}"

This is a ${spreadType === 'three-card' ? 'Three-Card' : 'Celtic Cross'} spread:

${cardsInfo}

Please provide a comprehensive tarot reading that:
1. Interprets each card's position and meaning
2. Shows how the cards relate to each other
3. Addresses the querent's specific question
4. Offers guidance and insights for their path forward

Keep the reading 300-500 words, warm and insightful.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    // Development-only logging of the messages sent to the LLM
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('--- LLM Reading Request Messages ---');
        console.log(JSON.stringify(messages, null, 2));
        console.log('--- End LLM Reading Request Messages ---');
      } catch (logErr) {
        console.warn('Failed to log LLM messages:', logErr);
      }
    }

    const completion = await client.chat.completions.create({
      model: process.env.QWEN_MODEL || 'qwen-plus',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    res.json({
      interpretation: completion.choices[0].message.content,
      // Return the same minimized card objects (avoid sending full card database)
      cards: cardsInfoObjects.map(ci => ({
        name: ci.name,
        arcana: ci.arcana,
        position: ci.position,
        reversed: ci.reversed,
        keywords: ci.keywords,
      }))
    });

  } catch (error) {
    console.error('Reading API error:', error);
    res.status(500).json({ 
      error: 'Failed to generate reading',
      details: error.message 
    });
  }
});

// API: Chat follow-up questions about reading
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, readingContext } = req.body;

    const systemPrompt = `You are a wise tarot reader continuing a conversation with a querent. You have already provided an initial reading. Now you're answering follow-up questions and engaging in dialogue.

Current reading context:
${readingContext}

Guidelines:
- Be warm, empathetic, and non-judgmental
- Ask clarifying questions when needed
- Help the querent explore deeper meanings
- Encourage self-reflection and personal agency
- Avoid making absolute predictions about health, legal matters, or death
- Keep responses conversational (2-4 paragraphs max)`;

    // Add system prompt to the beginning of messages
    const allMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // Development-only logging of the chat continuation messages
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('--- LLM Chat Request Messages ---');
        console.log(JSON.stringify(allMessages, null, 2));
        console.log('--- End LLM Chat Request Messages ---');
      } catch (logErr) {
        console.warn('Failed to log LLM chat messages:', logErr);
      }
    }

    const completion = await client.chat.completions.create({
      model: process.env.QWEN_MODEL || 'qwen-plus',
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 500,
    });

    res.json({ response: completion.choices[0].message.content });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🔮 Oracl server running on http://localhost:${PORT}`);
});
