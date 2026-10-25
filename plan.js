exports.handler = async (event) => {
  try {
    const { prompt } = JSON.parse(event.body || "{}");
    if (!prompt) return { statusCode: 400, body: "Missing prompt" };
    
    const apiKey = process.env.GEMINI_API_KEY;
    // Updated to the lighter model recommended in your project notes
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    let attempt = 0;
    let r, d;

    // Retry loop with exponential backoff for overloaded servers
    while (attempt < 3) {
      r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: payload
      });
      
      d = await r.json();

      // Break out of the loop if successful or if the error is not 503 (Overloaded) / 429 (Rate Limited)
      if (r.ok || (r.status !== 503 && r.status !== 429)) {
        break;
      }
      
      attempt++;
      if (attempt < 3) {
        // Wait 1 second on first retry, 2 seconds on second retry
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
    
    if (!r.ok) {
      return { 
        statusCode: r.status, 
        body: JSON.stringify({ error: "Gemini API Error", details: d }) 
      };
    }

    const parts = (d.candidates && d.candidates[0] && d.candidates[0].content.parts) || [];
    const text = parts.map(p => p.text || "").join("");
    return { statusCode: 200, body: JSON.stringify({ text }) };
    
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
