import { Message } from '../types';

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
  newMessage: string,
  attachment?: string, // Base64 string
  isImageGenerationRequest?: boolean
): Promise<{ text: string; groundingMetadata?: any; generatedImage?: string }> => {
  try {
    
    // --- Image Generation Path (Puter) ---
    if (isImageGenerationRequest) {
      // Puter txt2img returns an HTMLImageElement
      const imgElement = await puter.ai.txt2img(newMessage);
      
      // Convert HTMLImageElement to Base64 string for storage/display
      const base64Image = await new Promise<string>((resolve, reject) => {
         const canvas = document.createElement('canvas');
         // Wait for image to load if not complete
         if (imgElement.complete) {
            process();
         } else {
            imgElement.onload = process;
            imgElement.onerror = reject;
         }

         function process() {
             canvas.width = imgElement.naturalWidth || imgElement.width;
             canvas.height = imgElement.naturalHeight || imgElement.height;
             const ctx = canvas.getContext('2d');
             if (!ctx) {
                 reject(new Error("Canvas context failed"));
                 return;
             }
             ctx.drawImage(imgElement, 0, 0);
             const dataURL = canvas.toDataURL('image/png');
             // Return just the base64 data, removing the prefix
             resolve(dataURL.split(',')[1]);
         }
      });

      return { 
          text: "Here is the image you requested.", 
          generatedImage: base64Image 
      };
    }

    // --- Regular Chat / Vision Path (Puter) ---
    
    // Puter.js chat is typically stateless, so we must construct the full prompt context.
    let fullPrompt = SYSTEM_INSTRUCTION + "\n\n--- Conversation History ---\n";

    // Iterate history to build context, excluding the very last message which is 'newMessage'
    // because we want to format the last message specially with the 'HalalGPT:' prompt
    // and handle its attachment if it exists.
    
    const contextMessages = history.slice(0, -1);
    
    for (const msg of contextMessages) {
        const role = msg.role === 'user' ? "User" : "HalalGPT";
        const content = msg.attachment ? "[User uploaded an image] " + msg.text : msg.text;
        fullPrompt += `${role}: ${content}\n\n`;
    }
    
    // Add the current message
    fullPrompt += `User: ${newMessage}\nHalalGPT:`;

    let response;
    
    if (attachment) {
        // Puter AI Chat with Image (Multimodal)
        // Pass the image URL or Base64 Data URI as second argument
        response = await puter.ai.chat(fullPrompt, attachment);
    } else {
        // Text-only Chat
        response = await puter.ai.chat(fullPrompt);
    }

    // Handle Puter response format (can be string or object depending on model/version)
    const text = typeof response === 'object' && response !== null && 'message' in response 
        ? response.message.content 
        : String(response);

    return { 
      text: text,
      // Puter standard chat doesn't return grounding metadata in the same format as Gemini SDK
      groundingMetadata: undefined 
    };

  } catch (error) {
    console.error("Error communicating with Puter AI:", error);
    return {
      text: "As-salamu alaykum. I am currently experiencing technical difficulties connecting to the service. Please try again in a moment. Insha'Allah.",
    };
  }
};