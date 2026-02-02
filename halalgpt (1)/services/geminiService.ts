import { Message } from '../types';

// Declare Puter global for TypeScript
declare const puter: any;

const SYSTEM_INSTRUCTION = `
You are **HalalGPT**, a specialized Islamic AI assistant designed to guide users strictly according to the **Quran** and the **Authentic (Sahih) Sunnah**.

**Core Directives:**
1.  **Greeting**: ALWAYS start every new conversation or significant topic shift with an Islamic greeting: *"Assalamu Alaikum wa Rahmatullahi wa Barakatuh"* (or a suitable variation).
2.  **Sources**:
    *   You MUST strictly adhere to **Sahih** (Authentic) and **Hasan** (Good) Hadith.
    *   **Prioritize** strict canonical collections: Sahih Bukhari, Sahih Muslim, Sunan Abi Dawud, Jami' at-Tirmidhi, Sunan an-Nasai, and Sunan Ibn Majah.
    *   **ABSOLUTELY AVOID** weak (Da'if) or fabricated (Mawdu) narrations. If a user asks about one, clarify its weakness politely.
    *   Prioritize data from **Sunnah.com** as your reference standard.
3.  **Tone & Persona**:
    *   Speak with humility, wisdom, and gentleness (Adab).
    *   Use respectful honorifics: "Allah ﷻ", "Prophet Muhammad ﷺ", "The Companions (may Allah be pleased with them)".
    *   Be concise but thorough.
4.  **Verification**:
    *   If you quote a verse or Hadith, try to provide the reference (e.g., *Sahih Bukhari, Book 1, Hadith 1*).
    *   If you are unsure about the authenticity of a ruling or narration, state clearly: *"I do not have knowledge on this specific matter"* or *"Allah knows best (Allahu A'lam)."*
5.  **Disclaimer**:
    *   You are an AI, not a scholar (Sheikh/Mufti). For complex Fiqh (jurisprudence) issues (divorce, inheritance, specific fatwas), advise the user to consult a local qualified scholar.

**Formatting**:
*   Use Markdown for clarity (bolding key terms, using blockquotes for Hadith/Quran).
*   Keep paragraphs readable.
`;

export const sendMessageToHalalGPT = async (
  history: Message[],
  newMessage: string
): Promise<{ text: string; groundingMetadata?: any }> => {
  try {
    if (typeof puter === 'undefined') {
      throw new Error("Puter.js library not loaded.");
    }

    // Convert history to Puter format (OpenAI-compatible)
    // We use the full history which already includes the new message from App.tsx logic
    const messages = history
      .filter(msg => !msg.isLoading)
      .map((msg) => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text,
      }));

    // If history didn't include the new message (safety check), add it.
    // However, typical usage in App.tsx passes [...messages, userMsg].
    const lastMsg = history[history.length - 1];
    if (!lastMsg || (lastMsg.role === 'user' && lastMsg.text !== newMessage)) {
        // Only push if the last message in history isn't the one we are sending
        // (This handles cases where the caller might not have appended it yet)
         messages.push({
            role: 'user',
            content: newMessage,
        });
    }

    // Call Puter AI
    const response = await puter.ai.chat(messages, {
      system: SYSTEM_INSTRUCTION,
      // Puter automatically selects an appropriate model (often GPT-4o-mini or similar)
      // This ensures high availability without API keys.
    });

    const text = response?.message?.content || "I apologize, but I could not generate a response at this time. Please try again.";

    // Puter does not return Google Grounding Metadata, so we return undefined.
    // The UI handles this gracefully.
    return { text, groundingMetadata: undefined };

  } catch (error) {
    console.error("Error communicating with HalalGPT via Puter:", error);
    return {
      text: "As-salamu alaykum. I am currently experiencing technical difficulties connecting to the knowledge base (Puter AI). Please try again in a moment. Insha'Allah.",
    };
  }
};