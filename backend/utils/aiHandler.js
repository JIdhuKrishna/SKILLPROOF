const { GoogleGenAI } = require("@google/genai");

const timedLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    process.stdout.write(`[${time}] ${msg}\n`);
};

timedLog(`API Key loaded: ${!!process.env.GEMINI_API_KEY}`);
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const extractResumeData = async (fileBuffer) => {
    try {
        timedLog("Extracting resume via multimodal PDF bytes...");

        const prompt = `You are an AI that extracts precise information from resumes.
Extract the following into a structured JSON profile. Even if the layout has multiple columns or sidebars, ensure skills and experience are mapped correctly.
Analyze the document and return a JSON object with this exact structure:
{
  "fullName": "string",
  "email": "string",
  "skills": ["string"], 
  "experienceSummary": "string",
  "education": [{"institution": "string", "degree": "string"}],
  "suggestedRole": "string",
  "industry": "string"
}

Constraint: Return ONLY the JSON block. Do not include any conversational text, explanations, or formatting.
Do NOT wrap the response in markdown code blocks like \`\`\`json. Just output the raw JSON object.`;

        const response = await client.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: [
                {
                    inlineData: {
                        data: fileBuffer.toString('base64'),
                        mimeType: 'application/pdf'
                    }
                },
                prompt
            ],
            config: {
                responseMimeType: "application/json",
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            }
        });

        let responseText = response.text;

        timedLog(`Raw AI Response length: ${responseText.length} chars`);

        if (!responseText) {
            console.error("AI returned an empty response.");
            throw new Error("Empty response from AI model.");
        }

        // Clean up markdown block syntax if AI mistakenly added it despite our prompt
        responseText = responseText.replace(/```[a-z]*\n?/ig, '').replace(/```/g, '').trim();

        let jsonData;
        try {
            jsonData = JSON.parse(responseText);
        } catch (jsonErr) {
            console.error('AI returned malformed JSON:', responseText);
            throw new Error('Failed to parse AI response as JSON.');
        }

        return jsonData;

    } catch (error) {
        console.error('Error in extractResumeData AI service - Message:', error.message);
        console.error('Full Error Object:', error);
        throw error;
    }
};

const generateAssessment = async (skills, suggestedRole) => {
    try {
        timedLog("Generating assessment questions...");
        timedLog(`Skills sent to Gemini: ${skills.join(', ')}`);

        const prompt = `You are a technical interviewer evaluating a candidate for a ${suggestedRole} role.
Their skills include: ${skills.join(', ')}.
Generate exactly 5 technical questions to assess these skills: 4 multiple-choice questions (type: "mcq") and 1 coding challenge (type: "coding").
The coding challenge should be based on the most prominent skill from: ${skills.join(', ')}.

Return ONLY a strict JSON array of objects. Each object must have a "type" property ("mcq" or "coding").

For "mcq" type, use this structure:
{
  "type": "mcq",
  "questionText": "The question string",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The exact string from options that is correct"
}

For "coding" type, use this structure:
{
  "type": "coding",
  "problemStatement": "Detailed problem description",
  "initialCode": "Boilerplate code for the candidate to start with",
  "expectedOutputDescription": "What the code is expected to produce"
}

Constraint: Do not include any conversational text or formatting. Just output the raw JSON array.`;

        const response = await client.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: [prompt],
            config: {
                responseMimeType: "application/json",
            }
        });

        let responseText = response.text;
        timedLog(`\n--- BEGIN RAW GEMINI RESPONSE ---\n${responseText}\n--- END RAW GEMINI RESPONSE ---\n`);

        if (!responseText) {
            throw new Error("Empty response from AI for assessment.");
        }

        responseText = responseText.replace(/```[a-z]*\n?/ig, '').replace(/```/g, '').trim();

        let questions;
        try {
            questions = JSON.parse(responseText);
            timedLog(`\n--- BEGIN PARSED JSON ASSESSMENT ---\n${JSON.stringify(questions, null, 2)}\n--- END PARSED JSON ASSESSMENT ---\n`);
        } catch (jsonErr) {
            throw new Error('Failed to parse assessment questions JSON.');
        }

        return questions;

    } catch (error) {
        console.error('Error in generateAssessment:', error.message);
        throw error;
    }
};

const generateUniversalAssessment = async (extractedSkills, detectedIndustry) => {
    try {
        timedLog("Generating universal assessment questions...");
        timedLog(`Skills: ${extractedSkills.join(', ')} | Industry: ${detectedIndustry}`);

        const prompt = `You are an expert evaluator. Generate exactly 5 questions for a candidate in the "${detectedIndustry}" industry with skills: ${extractedSkills.join(', ')}.

Determine if the industry or skills heavily involve Software Engineering, Programming, Computer Science, or IT.
If YES (Software/Tech roles):
- 1 Technical Question (type: "coding"): A coding challenge based on their primary programming language.
- 1 Technical Question (type: "mcq"): Domain-specific conceptual question.
- 2 Logical Reasoning Questions (type: "mcq"): Scenario-based problem solving relevant to their work environment.
- 1 Critical Thinking Task (type: "mcq"): Identify a flaw in a provided statement or data set relevant to the industry.

If NO (Non-Software roles like Healthcare, Finance, Arts, Marine, etc.):
- 2 Technical Questions (type: "mcq"): Domain-specific based on their skills and industry.
- 2 Logical Reasoning Questions (type: "mcq"): Scenario-based problem solving relevant to their work environment.
- 1 Critical Thinking Task (type: "mcq"): Identify a flaw in a provided statement or data set relevant to the industry.

Return ONLY a strict JSON array of exactly 5 objects.

For "mcq" questions, use this structure:
{
  "type": "mcq",
  "category": "technical", // "technical", "logical", or "critical"
  "questionText": "The question string",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The exact string from options that is correct"
}

For "coding" questions (ONLY if applicable), use this structure:
{
  "type": "coding",
  "category": "technical",
  "problemStatement": "Detailed problem description",
  "initialCode": "Boilerplate code for the candidate to start with",
  "expectedOutputDescription": "What the code is expected to produce"
}

Ensure there are exactly 2 questions with category "technical", 2 with category "logical", and 1 with category "critical".
Constraint: Do not include any conversational text, explanations, or formatting. Just output the raw JSON array.`;

        const response = await client.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: [prompt],
            config: {
                responseMimeType: "application/json",
            }
        });

        let responseText = response.text;
        timedLog(`\n--- BEGIN RAW GEMINI RESPONSE ---\n${responseText}\n--- END RAW GEMINI RESPONSE ---\n`);

        if (!responseText) {
            throw new Error("Empty response from AI for universal assessment.");
        }

        responseText = responseText.replace(/```[a-z]*\n?/ig, '').replace(/```/g, '').trim();

        let questions;
        try {
            questions = JSON.parse(responseText);
            timedLog(`\n--- BEGIN PARSED JSON ASSESSMENT ---\n${JSON.stringify(questions, null, 2)}\n--- END PARSED JSON ASSESSMENT ---\n`);
        } catch (jsonErr) {
            console.error('AI returned malformed JSON:', responseText);
            throw new Error('Failed to parse universal assessment questions JSON.');
        }

        return questions;

    } catch (error) {
        console.error('Error in generateUniversalAssessment:', error.message);
        throw error;
    }
};

module.exports = {
    extractResumeData,
    generateAssessment,
    generateUniversalAssessment
};
