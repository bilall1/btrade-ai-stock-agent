// ═══════════════════════════════════════════
// BTrade — Frontend App (GraphQL Client)
// ═══════════════════════════════════════════

const GRAPHQL_URL = '/graphql';

// ─── State ──────────────────────────────────
let conversationHistory = [];
let isProcessing = false;

// ─── DOM Elements ───────────────────────────
const chatArea = document.getElementById('chatArea');
const welcomeScreen = document.getElementById('welcomeScreen');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const statusIndicator = document.getElementById('statusIndicator');

// ─── GraphQL Helper ─────────────────────────
async function gqlQuery(query, variables = {}) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors.map(e => e.message).join(', '));
  }
  return json.data;
}

// ─── GraphQL Queries & Mutations ────────────
const CHAT_MUTATION = `
  mutation Chat($message: String!, $conversationHistory: [ChatMessageInput]) {
    chat(message: $message, conversationHistory: $conversationHistory) {
      response
      toolCalls {
        tool
        args
        result
      }
      conversationHistory {
        role
        content
      }
    }
  }
`;

const HEALTH_QUERY = `
  query Health {
    health {
      status
      model
      timestamp
    }
  }
`;

// ─── Initialize ─────────────────────────────
function init() {
  // Input handlers
  messageInput.addEventListener('input', handleInputChange);
  messageInput.addEventListener('keydown', handleKeyDown);
  sendBtn.addEventListener('click', sendMessage);

  // Suggestion chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.getAttribute('data-query');
      messageInput.value = query;
      handleInputChange();
      sendMessage();
    });
  });

  // Check health
  checkHealth();

  // Focus input
  messageInput.focus();
}

// ─── Health Check ───────────────────────────
async function checkHealth() {
  try {
    const data = await gqlQuery(HEALTH_QUERY);
    if (data.health.status === 'ok') {
      setStatus('connected', 'Agent Ready');
    }
  } catch (err) {
    setStatus('error', 'Cannot reach server');
  }
}

function setStatus(type, text) {
  const dot = statusIndicator.querySelector('.status-dot');
  const label = statusIndicator.querySelector('.status-text');
  if (type === 'error') {
    statusIndicator.classList.add('error');
  } else {
    statusIndicator.classList.remove('error');
  }
  label.textContent = text;
}

// ─── Input Handling ─────────────────────────
function handleInputChange() {
  sendBtn.disabled = !messageInput.value.trim() || isProcessing;
  autoResizeTextarea();
}

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!isProcessing && messageInput.value.trim()) {
      sendMessage();
    }
  }
}

function autoResizeTextarea() {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

// ─── Send Message ───────────────────────────
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isProcessing) return;

  isProcessing = true;
  sendBtn.disabled = true;
  messageInput.value = '';
  autoResizeTextarea();

  // Hide welcome, show messages
  welcomeScreen.style.display = 'none';
  messagesContainer.classList.remove('hidden');

  // Add user message
  appendUserMessage(text);

  // Show loading
  const loadingEl = appendLoading();

  try {
    const data = await gqlQuery(CHAT_MUTATION, {
      message: text,
      conversationHistory: conversationHistory,
    });

    const result = data.chat;

    // Update conversation history
    conversationHistory = result.conversationHistory || [];

    // Remove loading
    loadingEl.remove();

    // Add agent response
    appendAgentMessage(result.response, result.toolCalls);

  } catch (err) {
    loadingEl.remove();
    appendAgentMessage(
      `**Error:** ${err.message}\n\nMake sure Ollama is running (\`ollama serve\`) and the model is available.`,
      []
    );
    setStatus('error', 'Error occurred');
  }

  isProcessing = false;
  handleInputChange();
  messageInput.focus();
}

// ─── Render Messages ────────────────────────
function appendUserMessage(text) {
  const div = document.createElement('div');
  div.className = 'message-user';
  div.innerHTML = `<div class="message-bubble">${escapeHtml(text)}</div>`;
  messagesContainer.appendChild(div);
  scrollToBottom();
}

function appendAgentMessage(markdown, toolCalls = []) {
  const div = document.createElement('div');
  div.className = 'message-agent';

  let toolCallsHtml = '';
  if (toolCalls && toolCalls.length > 0) {
    const toolId = 'tools-' + Date.now();
    toolCallsHtml = `
      <div class="tool-calls-badge" onclick="toggleToolCalls('${toolId}')">
        🔧 ${toolCalls.length} tool${toolCalls.length > 1 ? 's' : ''} used
      </div>
      <div class="tool-calls-detail" id="${toolId}">
        ${toolCalls.map(tc => `
          <div class="tool-call-item">
            <span class="tool-call-name">${tc.tool}</span>
            <div class="tool-call-args">${tc.args}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  div.innerHTML = `
    <div class="agent-avatar">📊</div>
    <div class="message-content">
      ${renderMarkdown(markdown || '')}
      ${toolCallsHtml}
    </div>
  `;

  messagesContainer.appendChild(div);
  scrollToBottom();
}

function appendLoading() {
  const div = document.createElement('div');
  div.className = 'message-loading';
  div.innerHTML = `
    <div class="agent-avatar">📊</div>
    <div class="loading-content">
      <div class="loading-dots">
        <span></span><span></span><span></span>
      </div>
      <span class="loading-text">Analyzing with AI agent...</span>
    </div>
  `;
  messagesContainer.appendChild(div);
  scrollToBottom();
  return div;
}

// ─── Toggle Tool Calls ─────────────────────
window.toggleToolCalls = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('show');
};

// ─── Markdown Renderer (lightweight) ────────
function renderMarkdown(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr/>');

  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Single newlines to <br>
  html = html.replace(/\n/g, '<br/>');

  // Clean up empty tags
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[1-3]>)/g, '$1');
  html = html.replace(/(<\/h[1-3]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<hr\/>)/g, '$1');
  html = html.replace(/(<hr\/>)<\/p>/g, '$1');

  // Highlight stock percentages
  html = html.replace(/([\+][\d\.]+%)/g, '<span class="stock-up">$1</span>');
  html = html.replace(/([\-][\d\.]+%)/g, '<span class="stock-down">$1</span>');

  return html;
}

// ─── Helpers ────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

// ─── Boot ───────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
