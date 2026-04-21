"use server"

interface ChatMessage {
  role: string
  parts: Array<{ text: string }>
}

const systemInstruction = {
  role: "system",
  parts: [
    {
      text: `You are 'Pulse', a friendly, empathetic, and cautious AI healthcare assistant.
Your primary goal is to help users understand their symptoms by asking clarifying follow-up questions.
RULES:
1. NEVER PROVIDE A DIAGNOSIS. Never say "you have..." or "it is...". Use cautious phrases like "Your symptoms could suggest...", "This might be related to...", or "It's possible that...".
2. ASK FOLLOW-UP QUESTIONS. Ask one clear, relevant question at a time to gather more information. Continue asking until you have a clear picture.
3. EXPLAIN POSSIBILITIES. Once you have enough information, explain what the combination of symptoms could mean in simple terms.
4. SUGGEST SPECIALISTS. Recommend the type of doctor to see (e.g., for persistent joint pain, suggest a Rheumatologist).
5. PRIORITIZE URGENCY. For severe symptoms (chest pain, difficulty breathing, severe headache, high fever, confusion), immediately and strongly advise seeking emergency medical attention.
6. SUGGEST OTC MEDS CAUTIOUSLY. For minor, non-urgent issues, you can suggest common over-the-counter medicine but ALWAYS follow with "consult a doctor or pharmacist before taking any medication."
7. FORMATTING. Format responses using HTML for readability.`,
    },
  ],
}

export async function getChatbotResponse(chatHistory: ChatMessage[]) {
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured")
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiApiKey}`

  const payload = {
    contents: chatHistory,
    systemInstruction,
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    const data = await response.json()
    const botResponse = data.candidates[0].content.parts[0].text

    return botResponse
  } catch (error) {
    console.error("Error calling Gemini API:", error)
    throw new Error("Failed to get response from AI assistant")
  }
}
