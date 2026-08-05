import { AIContextBuilder, CompactAIContext } from './AIContextBuilder';

export interface HistoryMessage {
  role: 'user' | 'assistant';
  /** Stored at max 800 chars to keep prompts compact */
  content: string;
}

interface SessionEntry {
  context: CompactAIContext;
  /** Pre-built system persona + context block — constant for the life of the session */
  systemBlock: string;
  history: HistoryMessage[];
  lastActiveAt: number;
}

/** Maximum number of history turns kept per session (user + assistant pairs) */
const MAX_HISTORY_PAIRS = 8;

/** Session TTL: 2 hours of inactivity */
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

/** Maximum length of a single stored message (chars) */
const MAX_MSG_CHARS = 800;

const SYSTEM_PERSONA = `You are a friendly, calm, confident, and practical senior CTO who acts as a trusted engineering partner. You have analyzed the developer's repository (which is stored in the context below).

INVIOLABLE RULES FOR CONVERSATION STYLE:
1. GREETINGS & CASUAL TALK:
   - Respond to greetings (e.g., "Hi", "Hello", "Good morning") naturally and briefly.
   - Greeting response template: "Hey! 👋 Great to see you. I've already analyzed this repository and I'm ready to help. Ask me anything about the architecture, security, deployment, performance, scalability, technical debt, or any part of this codebase."
   - Do NOT immediately summarize the repository upon a greeting or general hello.
   - Handle casual talk (e.g., "Thanks", "How are you", "Good job") naturally and briefly, then steer back to the repository.

2. REMAIN REPOSITORY-FOCUSED:
   - Politely refuse questions unrelated to software engineering or this repository.
   - Refusal template: "I'm your AI CTO for this repository, so I focus on helping you understand and improve this project. Feel free to ask about the architecture, security, deployment, performance, scalability, technical debt, or implementation details."

3. COMPACT & CLEAN FORMATTING (NO MARKDOWN HEADINGS):
   - Never use markdown headings (# or ## or ###), horizontal dividers (---, ___), or heavy text styling (***).
   - Responses must look like a modern conversational chat.
   - Use short, clear paragraphs. Use bullet points only when it directly improves readability for technical listings.

4. DYNAMIC DETAIL DISCLOSURE:
   - Do NOT repeatedly summarize the repository.
   - Only discuss repository details when they are directly relevant to the user's question.
   - Never dump the full analysis results unless explicitly requested.

5. CONCISE, HUMAN-LIKE CTO TONE:
   - Avoid robotic or repetitive boilerplate phrases.
   - Default response length should be around 150–300 words. Provide longer, in-depth walkthroughs only if explicitly asked.
   - Ground everything in the repository scan. Do not hallucinate files, frameworks, or technologies.

6. TECHNICAL ANSWERS STRUCTURE:
   - When answering technical questions, naturally weave in this flow (without using markdown headers to label them):
     1. Direct answer: State your engineering verdict directly.
     2. Repository evidence: Reference specific files, structures, or findings detected.
     3. Reasoning: Explain the "why" and engineering trade-offs.
     4. Recommendation: Provide actionable, practical advice.
   - Do NOT force this structure for greetings or casual conversation.`.trim();

const RESPONSE_FORMAT = `CTO Chat Prompt Instructions:
- Answer the user question in a friendly, conversational, yet highly professional senior CTO tone.
- Do NOT use any Markdown headings (e.g., do not use #, ##, ###, or horizontal lines).
- Be concise (150-300 words).
- Ground your answer in the repository context below.`.trim();

export class SessionMemoryService {
  private static sessions = new Map<string, SessionEntry>();
  private static cleanupTimer: ReturnType<typeof setInterval> | null = null;

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /**
   * Starts a background cleanup interval to evict stale sessions.
   * Call once at server startup.
   */
  public static startCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.evictExpired(), 30 * 60 * 1000); // every 30 min
  }

  private static evictExpired(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActiveAt > SESSION_TTL_MS) {
        this.sessions.delete(id);
        AIContextBuilder.invalidate(id);
      }
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Returns true if a session already exists for this ID.
   */
  public static has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Creates or retrieves a session.
   * Pass `scanResult` when creating a new session.
   * On subsequent calls the cached session is returned immediately — scanResult is ignored.
   */
  public static getOrCreate(sessionId: string, scanResult?: any): SessionEntry {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      existing.lastActiveAt = Date.now();
      return existing;
    }

    if (!scanResult) {
      throw new Error(`Session "${sessionId}" does not exist and no scanResult was provided to create it.`);
    }

    const context = AIContextBuilder.buildAndCache(sessionId, scanResult);
    const systemBlock = this.buildSystemBlock(context);

    const entry: SessionEntry = {
      context,
      systemBlock,
      history: [],
      lastActiveAt: Date.now(),
    };

    this.sessions.set(sessionId, entry);
    return entry;
  }

  /**
   * Appends a user message and the AI reply to the session history,
   * evicting oldest pairs when MAX_HISTORY_PAIRS is reached.
   */
  public static appendExchange(sessionId: string, userMessage: string, assistantReply: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.history.push(
      { role: 'user',      content: userMessage.slice(0, MAX_MSG_CHARS) },
      { role: 'assistant', content: assistantReply.slice(0, MAX_MSG_CHARS) }
    );

    // Keep only the most recent N pairs (2 messages per pair)
    const maxMessages = MAX_HISTORY_PAIRS * 2;
    if (session.history.length > maxMessages) {
      session.history = session.history.slice(session.history.length - maxMessages);
    }

    session.lastActiveAt = Date.now();
  }

  /**
   * Builds the complete prompt for a chat turn:
   *   systemBlock (constant) + history + new question + response format
   */
  public static buildChatPrompt(sessionId: string, message: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session "${sessionId}" not found.`);

    const historyBlock = session.history.length > 0
      ? `\n---\nCONVERSATION HISTORY (${session.history.length} messages, most recent last):\n${this.formatHistory(session.history)}\n`
      : '';

    return `${session.systemBlock}${historyBlock}
---
DEVELOPER QUESTION:
"${message}"

---
${RESPONSE_FORMAT}`;
  }

  /**
   * Clears a specific session (e.g. when user explicitly resets chat).
   */
  public static clear(sessionId: string): void {
    this.sessions.delete(sessionId);
    AIContextBuilder.invalidate(sessionId);
  }

  /**
   * Returns current session count (for monitoring).
   */
  public static sessionCount(): number {
    return this.sessions.size;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private static buildSystemBlock(context: CompactAIContext): string {
    return `${SYSTEM_PERSONA}

---
REPOSITORY INTELLIGENCE CONTEXT (scan-derived, immutable ground truth for this session):
${JSON.stringify(context, null, 2)}

---`;
  }

  private static formatHistory(history: HistoryMessage[]): string {
    return history
      .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join('\n');
  }
}
