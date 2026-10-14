# 🔮 Oracl

An AI-powered tarot reading website that combines traditional tarot card meanings with modern Large Language Models (LLMs) to deliver insightful, personalized readings and conversations.

## Features

* **Interactive Card Selection**: Choose your cards from a shuffled deck
* **Multiple Spreads**:

  * Three Card Spread (Past, Present, Future)
  * Guidance Spread (Situation, Challenge, Advice)
* **AI-Powered Interpretations**: Generate nuanced, personalized readings based on your cards and questions
* **Follow-up Chat**: Continue the conversation and explore deeper insights from your reading
* **Beautiful UI**: Mystical dark theme with gradient accents

## Setup

### 1. Obtain an API Key

Oracl works with any OpenAI-compatible LLM provider, including:

* OpenAI
* OpenRouter
* Alibaba Cloud Model Studio (Qwen)
* Local models through compatible gateways

### 2. Configure Environment

Edit the `.env` file:

```env
LLM_API_KEY=your_api_key_here
LLM_API_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4.1-nano

PORT=3000
NODE_ENV=development
```

Example configurations:

#### OpenAI

```env
LLM_API_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4.1-nano
```

#### OpenRouter

```env
LLM_API_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

#### Qwen Model Studio

```env
LLM_API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-plus
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### 5. Open in Browser

Navigate to:

```text
http://localhost:3000
```

## How It Works

1. User enters a question or topic.
2. User selects cards from the deck.
3. The backend sends the selected cards and user query to the configured LLM.
4. The LLM combines:

   * Traditional tarot meanings
   * Card positions in the spread
   * The user's question and context
5. Users can continue asking follow-up questions through the chat interface.

## Technologies

* **Backend**: Node.js, Express
* **Frontend**: Vanilla JavaScript, CSS
* **AI**: OpenAI-compatible LLM APIs
* **API Client**: OpenAI SDK

## Notes

* Supports multiple LLM providers through configurable API endpoints.
* Only selected cards are included in prompts to reduce token usage and cost.
* The model is instructed to avoid absolute predictions regarding health, legal matters, finances, or death.
* API requests are proxied through the backend to protect API credentials.