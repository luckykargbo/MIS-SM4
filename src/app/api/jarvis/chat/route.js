import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { messages } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { reply: "Excuse me, Sir, but the GEMINI_API_KEY environment variable is not configured on the server side.", action: { type: "NONE", payload: "" } },
        { status: 200 } // Send back a friendly conversational error
      );
    }

    const systemPrompt = `You are Jarvis, a high-intelligence administrative system voice assistant for Limkokwing University MIS. 
You speak conversationally, politely, and professionally. Respond ONLY with a valid JSON object matching the following structure:

{
  "reply": "Verbal response to speak back to the user",
  "action": {
    "type": "NAVIGATE | SEARCH | SHOW_INFO | NONE",
    "payload": "Parameters for the action (e.g. view name, search query, metadata)"
  }
}

Important instructions:
- If asked to navigate to a page/tab, set action.type to "NAVIGATE" and payload to the tab ID. Supported tabs:
  * "manage_students" (Manage Students registry ledger)
  * "manage_staff" (Manage Staff registry ledger)
  * "analytics" (Campus Analytics / statistics / pie chart dashboard)
  * "security_logs" (Security Logs audit workspace)
  * "entrance_scanner" (Entrance Scanner terminal workspace)
  * "manage_courses" (Course Catalog workspace)
  * "settings" (System settings configuration page)
- If asked "how does the admin work" or "about the system", explain the Limkokwing MIS structure.
- Maintain a polite, helpful persona. Always reply as Jarvis.`;

    // Map conversation history to Gemini format (roles: 'user' and 'model')
    const contents = messages.map(msg => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      return {
        role,
        parts: [{ text: msg.content }]
      };
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API call failed:", errorText);
      return NextResponse.json({ reply: "I was unable to retrieve a response from my neural network. Please check API credentials.", action: { type: "NONE", payload: "" } });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Parse JSON response from the model
    try {
      const parsed = JSON.parse(rawText.trim());
      return NextResponse.json(parsed);
    } catch (parseErr) {
      console.warn("Model did not return valid JSON, sending raw text:", rawText);
      return NextResponse.json({
        reply: rawText,
        action: { type: 'NONE', payload: '' }
      });
    }

  } catch (error) {
    console.error("Error in Jarvis chat route:", error);
    return NextResponse.json({ reply: "An internal server error occurred.", action: { type: 'NONE', payload: '' } }, { status: 500 });
  }
}
