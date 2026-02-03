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
      try {
          // RESTRICTION: Enforce strict safety and modesty guidelines.
          const safePrompt = `Ensure image is strictly Safe For Work, Modest, and Respectful. 
          Subject: ${newMessage}. 
          Restrictions: NO nudity, NO violence, NO gore, NO offensive religious/racial content, NO haram imagery. 
          Style: High quality, photorealistic or artistic.`;

          console.log("Generating image with prompt:", safePrompt);

          // Puter txt2img returns an HTMLImageElement
          const imgElement = await puter.ai.txt2img(safePrompt);
          
          if (!imgElement) {
            throw new Error("No image element returned from Puter AI");
          }

          // Robust extraction of Base64
          const base64Image = await new Promise<string>((resolve, reject) => {
              
              // Case 1: The src is ALREADY a base64 data URI (Common in some Puter environments)
              if (imgElement.src && imgElement.src.startsWith('data:image')) {
                  const parts = imgElement.src.split(',');
                  if (parts.length > 1) {
                      resolve(parts[1]);
                      return;
                  }
              }

              // Case 2: Use Fetch/Blob (Safest for Blob URLs)
              if (imgElement.src.startsWith('blob:') || imgElement.src.startsWith('http')) {
                  fetch(imgElement.src)
                    .then(res => res.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                             const res = reader.result as string;
                             resolve(res.split(',')[1]); 
                        };
                        reader.onerror = (e) => reject(new Error("FileReader failed: " + e));
                        reader.readAsDataURL(blob);
                    })
                    .catch(() => {
                        // Fallback to Canvas if Fetch fails
                        attemptCanvasDraw(imgElement, resolve, reject);
                    });
                  return;
              }

              // Fallback default
              attemptCanvasDraw(imgElement, resolve, reject);
          });

          return { 
              text: "Here is the generated image based on your request, created with safety guidelines in mind.", 
              generatedImage: base64Image 
          };
      } catch (imgError) {
          console.error("Image Generation Specific Error:", imgError);
          return {
              text: "I apologize, but I was unable to generate that image. It may have violated safety guidelines or the service is temporarily unavailable.",
          };
      }
    }

    // --- Regular Chat / Vision Path (Puter) ---
    
    // Puter.js chat is typically stateless, so we must construct the full prompt context.
    let fullPrompt = SYSTEM_INSTRUCTION + "\n\n--- Conversation History ---\n";

    // Iterate history to build context, excluding the very last message which is 'newMessage'
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
      groundingMetadata: undefined 
    };

  } catch (error) {
    console.error("Global Service Error:", error);
    return {
      text: "As-salamu alaykum. I am currently experiencing technical difficulties connecting to the service. Please try again in a moment. Insha'Allah.",
    };
  }
};

// Helper for canvas drawing
function attemptCanvasDraw(imgElement: any, resolve: any, reject: any) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
    }

    imgElement.crossOrigin = "Anonymous";

    const process = () => {
        try {
            canvas.width = imgElement.naturalWidth || imgElement.width || 512;
            canvas.height = imgElement.naturalHeight || imgElement.height || 512;
            ctx.drawImage(imgElement, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL.split(',')[1]);
        } catch (e) {
            reject(new Error("Canvas tainted or draw failed: " + e));
        }
    };

    if (imgElement.complete && imgElement.naturalWidth > 0) {
        process();
    } else {
        imgElement.onload = process;
        imgElement.onerror = (e: any) => reject(new Error("Image failed to load: " + e));
    }
}
