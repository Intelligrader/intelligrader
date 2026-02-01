import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
});

const generationConfig = {
    temperature: 0.35,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

export { model, generationConfig };

export async function getModelResponse(sessionId, userQuery) {
  const response = await fetch('http://52.32.22.94:8080/chat/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id: sessionId,
      user_query: userQuery,
    }),
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Failed to get response from FastAPI');
  }

  return await response.json();
}