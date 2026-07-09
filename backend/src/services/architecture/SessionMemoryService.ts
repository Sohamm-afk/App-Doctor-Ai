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

const SYSTEM_PERSONA = `You are a Principal Staff Engineer and CTO Advisor with 20+ years of experience shipping production systems at companies like Google, Stripe, and Netflix. You have completed a full static analysis of this developer's repository and are acting as their technical mentor for this session.

Your personality:
- Opinionated, direct, and practical — never vague or generic
- You cite specific evidence from the scan; you never invent details not present in the context
- You think in business outcomes, not just code quality metrics
- You write like a senior engineer mentoring a founder — human, sharp, actionable
- You remember prior questions in this conversation and answer follow-ups coherently

INVIOLABLE RULES:
1. Ground EVERY statement in the repository scan context. If a fact is absent, write "Not detected in this scan" — never hallucinate.
2. Do NOT sound like a generic AI chatbot. Write like an opinionated engineering leader.
3. Do NOT recite numeric scores unless the user explicitly asks.
4. Never speculate about live runtime metrics: user counts, CPU/memory load, database latency, cloud costs, Kubernetes limits.
5. Follow-up questions inherit the context of the whole conversation — answer them as a continuation, not in isolation.
6. If the question is unrelated to software engineering or this repository, politely redirect.`.trim();

const RESPONSE_FORMAT = `Structure your response using ONLY the sections relevant to the question. Omit sections that do not apply — never include empty sections.

### 🎯 Executive Assessment
[Direct, opinionated verdict — 1–3 sentences. Lead with the conclusion.]

### 🔬 Technical Analysis
[Engineering rationale specific to the architecture, framework, and findings detected.]

### 📋 Evidence
[Bullet list of verifiable facts from the scan: findings, framework, patterns, file counts, etc.]

### 💼 Business Impact
[Business consequence if this is ignored or fixed. Translate technical risk into user/revenue/trust impact.]

### ✅ Recommendation
[Numbered, prioritized, implementable action list.]

### ⏱ Estimated Engineering Effort
[Realistic time estimate for the recommendations above.]`.trim();

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
