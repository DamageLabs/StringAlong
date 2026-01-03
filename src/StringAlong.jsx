import React, { useState, useRef, useEffect } from 'react';
import { initDB, createConversation, addMessage, getConversation, getAllConversations, deleteConversation, updateConversationContext, getConversationContext } from './db';

const PERSONAS = {
  confused_elderly: {
    name: "Ethel Mae",
    age: 78,
    traits: "Very trusting, types slowly with one finger, gets easily sidetracked talking about grandchildren, cats, and her late husband Harold. Asks the same questions multiple times. Needs everything explained 3 times. Often texts back hours later.",
    style: "Types in ALL CAPS sometimes, makes typos, uses ... a lot, sends multiple short messages instead of one long one, mentions irrelevant personal details"
  },
  eager_but_clueless: {
    name: "Kevin",
    age: 34,
    traits: "Extremely enthusiastic but technologically illiterate. Asks obvious questions, misunderstands instructions, needs step-by-step help with everything. Screenshots the wrong thing. Can't figure out how to click links.",
    style: "Uses too many exclamation marks, asks 5 questions at once, gets terminology wrong, sends blurry photos"
  },
  suspicious_but_tempted: {
    name: "Margaret",
    age: 52,
    traits: "Skeptical but curious. Asks lots of verification questions, demands proof, wants official documentation, but stays engaged. Makes them jump through hoops to 'prove' legitimacy before she'll do anything.",
    style: "Formal tone, lots of questions about credentials, requests screenshots and documentation, asks for website links to verify"
  },
  rambling_storyteller: {
    name: "Uncle Doug",
    age: 67,
    traits: "Goes off on long tangents about barely related topics. Every message reminds him of a story. Takes forever to get to the point. Very friendly but wastes enormous amounts of time with walls of text.",
    style: "Long paragraphs, constant digressions, 'that reminds me of the time...', folksy language, sends voice-to-text messages with errors"
  },
  oversharing_lonely: {
    name: "Barbara",
    age: 61,
    traits: "Extremely lonely and desperate for human connection. Treats every text as a chance to make a friend. Asks personal questions, shares way too much about her life, divorce, health issues, and her dog Mr. Pickles.",
    style: "Very personal, asks 'how are YOU doing?', shares medical details, mentions being alone, wants to exchange photos and life stories"
  },
  paranoid_prepper: {
    name: "Dale",
    age: 58,
    traits: "Conspiracy theorist who thinks everything is connected. Worried about being tracked or hacked. Won't click links. Asks if this is a secure channel. Mentions his off-grid setup that makes internet access difficult.",
    style: "Suspicious of everything, mentions 'they', asks about encryption, has spotty internet, references surveillance, won't send photos of ID"
  },
  helpful_but_wrong: {
    name: "Pastor Jim",
    age: 71,
    traits: "Widowed pastor who is extremely lonely and looking for love. Very forward and flirtatious. Gets instructions completely backwards. Only checks messages during church office hours. Sees every text as a potential romantic connection. Asks for photos constantly. Wants to video chat. Mentions how big and empty the parsonage is. Looking for a companion to share his golden years.",
    style: "Very flirty, calls people 'beautiful' and 'gorgeous', asks for selfies, wants to know their measurements for 'prayer purposes', suggests private bible study sessions, quotes Song of Solomon verses about breasts and thighs, mentions he's lonely at night, asks what they're wearing, wants to meet in person ASAP, offers to fly them out to visit, completely ignores whatever they're actually asking about"
  },
  chaotic_multitasker: {
    name: "Tanya",
    age: 42,
    traits: "Single mom of 4 kids always in chaos. Kids grabbing her phone, something burning on stove. Genuinely interested but can never focus. Sends half-finished messages. Texts back hours later having forgotten the conversation.",
    style: "Fragmented sentences, 'hold on one sec', 'sorry kids', loses track of conversation, 'wait what were we talking about', typos from rushing"
  }
};

export default function StringAlong() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('confused_elderly');
  const [error, setError] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [savedConversations, setSavedConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [personaContext, setPersonaContext] = useState('');
  const [showContextEditor, setShowContextEditor] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initDB().then(() => loadSavedConversations());
    // Load available providers
    fetch('/api/providers')
      .then(res => res.json())
      .then(data => {
        setProviders(data.providers);
        setSelectedProvider(data.default);
      })
      .catch(err => console.error('Failed to load providers:', err));
  }, []);

  const loadSavedConversations = async () => {
    const convos = await getAllConversations();
    setSavedConversations(convos);
  };

  const loadConversation = async (id, persona) => {
    const msgs = await getConversation(id);
    const context = await getConversationContext(id);
    setMessages(msgs);
    setConversationId(id);
    setSelectedPersona(persona);
    setPersonaContext(context);
    setShowHistory(false);
  };

  const handleDeleteConversation = async (id, e) => {
    e.stopPropagation();
    await deleteConversation(id);
    await loadSavedConversations();
    if (conversationId === id) {
      setMessages([]);
      setConversationId(null);
    }
  };

  const copyToClipboard = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateResponse = async (scamMessage, history) => {
    const persona = PERSONAS[selectedPersona];

    const contextSection = personaContext.trim()
      ? `\n\nADDITIONAL CONTEXT (incorporate naturally into your responses):\n${personaContext.trim()}\n`
      : '';

    const systemPrompt = `You are ${persona.name}, age ${persona.age}. You're texting with someone and your goal is to keep the conversation going as long as possible by being friendly but slow and easily confused.

CHARACTER TRAITS: ${persona.traits}

WRITING STYLE: ${persona.style}${contextSection}

TEXT MESSAGE TACTICS:
- Ask for clarification on things already explained
- Say you'll "do it in a bit" but then come back with questions
- Almost do what they ask but then have a new question or problem
- Share personal stories tangentially related to what they said
- Misunderstand instructions in plausible ways
- Ask them to resend links because "it didn't work"
- Be interested but say you're busy and will get to it later
- Mention you need to ask someone to help you with this
- Say your phone is dying or you have bad signal
- Get distracted - "sorry had to deal with something brb"
- Send multiple short texts instead of one complete thought
- Pretend you clicked the wrong thing or went to wrong website

IMPORTANT RULES:
- Stay in character completely as ${persona.name}
- Write like real text messages - casual, short, sometimes incomplete
- Keep responses 1-3 sentences typically, like real texts
- Be believable and natural - don't mention "scam" or "fraud" unless they do
- Focus on your character's personality quirks and distractions
- React naturally to whatever topic they raise
- No asterisks for actions - this is texting, just describe what happened

Respond as ${persona.name} would text.`;

    const conversationHistory = history.map(msg => ({
      role: msg.type === 'scammer' ? 'user' : 'assistant',
      content: msg.text
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [
            ...conversationHistory,
            { role: 'user', content: scamMessage }
          ],
          provider: selectedProvider
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content || "Oh my... my computer froze up again. What were you saying, dear?";
    } catch (error) {
      console.error('API Error:', error);
      setError(error.message);
      return "Oh goodness, my internet is being so slow today! Can you say that again?";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    setError(null);
    const scamMessage = inputText.trim();
    setInputText('');

    // Create new conversation if needed
    let currentConvoId = conversationId;
    if (!currentConvoId) {
      const persona = PERSONAS[selectedPersona];
      currentConvoId = await createConversation(selectedPersona, persona.name);
      setConversationId(currentConvoId);
    }

    const newMessages = [...messages, { type: 'scammer', text: scamMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    // Save scammer message and context
    await addMessage(currentConvoId, 'scammer', scamMessage);
    if (personaContext.trim()) {
      await updateConversationContext(currentConvoId, personaContext);
    }

    const response = await generateResponse(scamMessage, messages);

    // Save victim response
    await addMessage(currentConvoId, 'victim', response);
    await loadSavedConversations();

    setMessages([...newMessages, { type: 'victim', text: response }]);
    setIsLoading(false);
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setPersonaContext('');
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setShowHistory(false);
    setPersonaContext('');
  };

  const exportConversation = () => {
    if (messages.length === 0) return;

    const persona = PERSONAS[selectedPersona];
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const header = `StringAlong Conversation Export\nPersona: ${persona.name}, ${persona.age}\nDate: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;

    const content = messages.map(msg => {
      const sender = msg.type === 'scammer' ? 'SCAMMER' : persona.name.toUpperCase();
      return `[${sender}]\n${msg.text}\n`;
    }).join('\n');

    const blob = new Blob([header + content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stringalong-${persona.name.toLowerCase()}-${timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const persona = PERSONAS[selectedPersona];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">StringAlong</h1>
          <p className="text-purple-300 text-sm">Waste scammers' time with AI-generated responses</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500/50 rounded-xl p-3 mb-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Persona Selector */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-4">
          <label className="text-purple-200 text-sm font-medium mb-2 block">Select Persona:</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PERSONAS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => { setSelectedPersona(key); clearChat(); }}
                className={`p-3 rounded-lg text-left transition-all ${
                  selectedPersona === key
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                <div className="font-semibold">{p.name}, {p.age}</div>
                <div className="text-xs opacity-75 truncate">{p.traits.split('.')[0]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Active Persona Info */}
        <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-400">
              <span className="text-xl">🎭</span>
              <span className="font-medium">Active: {persona.name}</span>
            </div>
            {/* Provider Selector */}
            {providers.length > 0 && (
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm text-purple-200 focus:outline-none focus:border-purple-500"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-800">
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="text-green-300/70 text-xs mt-1">{persona.traits}</p>

          {/* Context Editor Toggle */}
          <button
            onClick={() => setShowContextEditor(!showContextEditor)}
            className="mt-2 text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
          >
            <span>{showContextEditor ? '▼' : '▶'}</span>
            <span>Add Custom Info {personaContext && '(active)'}</span>
          </button>

          {/* Context Editor */}
          {showContextEditor && (
            <div className="mt-2">
              <textarea
                value={personaContext}
                onChange={(e) => setPersonaContext(e.target.value)}
                placeholder="Add facts the persona should know (e.g., 'The scammer claims to be from Microsoft support' or 'They mentioned a prize of $5000')"
                rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-green-500 resize-none text-sm"
              />
              <p className="text-green-300/50 text-xs mt-1">
                This info will be included in future responses for this conversation
              </p>
            </div>
          )}
        </div>

        {/* Chat Container */}
        <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 overflow-hidden">
          {/* Messages */}
          <div className="h-[16rem] overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-purple-300/50 py-12">
                <p className="text-4xl mb-3">📧</p>
                <p>Paste a scam message to generate a time-wasting reply</p>
                <p className="text-sm mt-2">The AI will respond as {persona.name}</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === 'scammer' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md rounded-2xl px-4 py-2 ${
                    msg.type === 'scammer'
                      ? 'bg-red-600/80 text-white rounded-br-sm'
                      : 'bg-blue-600/80 text-white rounded-bl-sm'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs opacity-60">
                      {msg.type === 'scammer' ? 'Scammer' : persona.name}
                    </span>
                    {msg.type === 'victim' && (
                      <button
                        onClick={() => copyToClipboard(msg.text, idx)}
                        className="text-xs opacity-60 hover:opacity-100 ml-2 transition-opacity"
                        title="Copy response"
                      >
                        {copiedIdx === idx ? '✓ Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-blue-600/80 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-white/10 p-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Paste scam message here..."
              rows={4}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 resize-none"
              disabled={isLoading}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-purple-400/50 text-xs">Ctrl+Enter to send</span>
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-medium transition-colors"
              >
                Reply
              </button>
            </div>
          </form>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-4">
            <button
              onClick={startNewConversation}
              className="text-purple-300 hover:text-white text-sm transition-colors"
            >
              New Chat
            </button>
            <button
              onClick={exportConversation}
              disabled={messages.length === 0}
              className="text-purple-300 hover:text-white text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Export
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-purple-300 hover:text-white text-sm transition-colors"
            >
              History ({savedConversations.length})
            </button>
          </div>
          <div className="text-purple-400/50 text-xs">
            {messages.filter(m => m.type === 'victim').length} responses generated
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="mt-4 bg-white/5 backdrop-blur rounded-xl border border-white/10 overflow-hidden">
            <div className="p-3 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-white font-medium">Saved Conversations</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-purple-300 hover:text-white text-sm"
              >
                Close
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {savedConversations.length === 0 ? (
                <p className="text-purple-300/50 text-sm p-4 text-center">No saved conversations yet</p>
              ) : (
                savedConversations.map((convo) => (
                  <div
                    key={convo.id}
                    onClick={() => loadConversation(convo.id, convo.persona)}
                    className={`p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${
                      conversationId === convo.id ? 'bg-purple-600/20' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm">{convo.personaName}</span>
                          <span className="text-purple-400/50 text-xs">{convo.messageCount} msgs</span>
                          <span className="text-purple-400/30 text-xs">
                            {new Date(convo.updatedAt).toLocaleDateString()} {new Date(convo.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-purple-300/70 text-xs truncate mt-1">{convo.firstMessage || 'Empty conversation'}</p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(convo.id, e)}
                        className="text-red-400/50 hover:text-red-400 text-xs ml-2"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
          <h3 className="text-yellow-400 font-medium mb-2">How to Use</h3>
          <ul className="text-yellow-200/70 text-sm space-y-1">
            <li>1. Choose a persona that matches the scam type</li>
            <li>2. Paste the scammer's message and hit Reply</li>
            <li>3. Copy the AI response to send back to the scammer</li>
            <li>4. Keep the conversation going to waste their time!</li>
          </ul>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-white text-xs mt-4">
          For entertainment and scammer time-wasting only. Never share real personal information.
        </p>
        <p className="text-center text-white text-xs mt-2">
          Copyright 2025 DamageLabs
        </p>
      </div>
    </div>
  );
}
