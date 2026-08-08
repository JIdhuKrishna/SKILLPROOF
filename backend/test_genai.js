const { GoogleGenAI } = require("@google/genai");

const client = new GoogleGenAI({ apiKey: "foo" });
console.log(typeof client.models.generateContent);
console.log(typeof client.models.get);
