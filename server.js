import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Get available providers
app.get('/api/providers', (req, res) => {
  const providers = [];

  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({ id: 'anthropic', name: 'Anthropic Claude', model: 'claude-sonnet-4-20250514' });
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push({ id: 'openai', name: 'OpenAI GPT-4o', model: 'gpt-4o' });
  }
  // Ollama is always available if running locally
  providers.push({ id: 'ollama', name: 'Ollama (Local)', model: process.env.OLLAMA_MODEL || 'llama3' });

  res.json({ providers, default: providers[0]?.id || 'ollama' });
});

// Anthropic API handler
async function callAnthropic(system, messages) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: system,
      messages: messages
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text;
}

// OpenAI API handler
async function callOpenAI(system, messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const openaiMessages = [
    { role: 'system', content: system },
    ...messages
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1000,
      messages: openaiMessages
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

// Ollama API handler (local)
async function callOllama(system, messages) {
  const model = process.env.OLLAMA_MODEL || 'llama3';
  const baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

  const ollamaMessages = [
    { role: 'system', content: system },
    ...messages
  ];

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: ollamaMessages,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}. Is Ollama running?`);
  }

  const data = await response.json();
  return data.message?.content;
}

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  const { system, messages, provider = 'anthropic' } = req.body;

  try {
    let content;

    switch (provider) {
      case 'openai':
        content = await callOpenAI(system, messages);
        break;
      case 'ollama':
        content = await callOllama(system, messages);
        break;
      case 'anthropic':
      default:
        content = await callAnthropic(system, messages);
        break;
    }

    res.json({ content: content || "Sorry, I didn't get a response. Can you try again?" });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to connect to AI API' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log('Configured providers:');
  if (process.env.ANTHROPIC_API_KEY) console.log('  - Anthropic Claude');
  if (process.env.OPENAI_API_KEY) console.log('  - OpenAI GPT-4o');
  console.log('  - Ollama (local)');
});
