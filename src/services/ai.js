export async function translateCode(ollamaUrl, ollamaModel, sourceCode, targetLanguage) {
  if (!ollamaUrl || !ollamaModel) {
    throw new Error("Ollama URL and Model Name are required.");
  }
  
  const prompt = `
You are an expert programmer and code translator. 
Translate the following code into ${targetLanguage}.

Return your response strictly in the following JSON format:
{
  "translatedCode": "the translated code string here",
  "notes": "A brief explanation of any idiomatic changes or major structural changes you made, or an empty string if it's a direct translation."
}

Do not use markdown code block formatting (\`\`\`) around the JSON response.

Source Code:
${sourceCode}
`;

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: prompt,
        stream: false,
        format: 'json'
      }),
    });

    if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.response;
    
    let cleanJsonStr = responseText.trim();
    if (cleanJsonStr.startsWith("\`\`\`json")) {
        cleanJsonStr = cleanJsonStr.substring(7);
    }
    if (cleanJsonStr.startsWith("\`\`\`")) {
        cleanJsonStr = cleanJsonStr.substring(3);
    }
    if (cleanJsonStr.endsWith("\`\`\`")) {
        cleanJsonStr = cleanJsonStr.slice(0, -3);
    }
    return JSON.parse(cleanJsonStr.trim());
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

export async function debugCode(ollamaUrl, ollamaModel, selectedFiles) {
  if (!ollamaUrl || !ollamaModel) {
    throw new Error("Ollama URL and Model Name are required.");
  }

  let codeContext = selectedFiles.map(f => `<file id="${f.id}" name="${f.name}">\n${f.content}\n</file>`).join("\n\n");

  const prompt = `
You are an expert programmer and code debugger. 
Analyze the following files and identify any genuine bugs, syntax errors, or logical flaws.
CRITICAL INSTRUCTION: If the code is functionally correct and has no bugs, you MUST return {"bugs": []}. Do NOT explain how the code works. Do NOT report a bug if you are not changing the code.

Return your response strictly in the following JSON format:
{
  "bugs": [
    {
      "fileId": "the id of the file the bug is in",
      "explanation": "A clear, plain-English explanation of the bug and how it breaks.",
      "buggy_code": "The EXACT lines of code from the file that are broken. This must be an exact substring match of the original file content so it can be replaced.",
      "fixed_code": "The EXACT lines of code to replace the buggy_code with."
    }
  ]
}

If there are no bugs, return {"bugs": []}.
Do not use markdown code block formatting (\`\`\`) around the JSON response.

Files to analyze:
${codeContext}
`;

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: prompt,
        stream: false,
        format: 'json'
      }),
    });

    if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    let cleanJsonStr = data.response.trim();
    if (cleanJsonStr.startsWith("\`\`\`json")) cleanJsonStr = cleanJsonStr.substring(7);
    if (cleanJsonStr.startsWith("\`\`\`")) cleanJsonStr = cleanJsonStr.substring(3);
    if (cleanJsonStr.endsWith("\`\`\`")) cleanJsonStr = cleanJsonStr.slice(0, -3);
    
    return JSON.parse(cleanJsonStr.trim());
  } catch (error) {
    console.error("Debugging error:", error);
    throw error;
  }
}

export async function lintCode(url, model, code) {
  const prompt = `
Analyze the following code for syntax errors, critical logic flaws, or missing imports. 
Do not suggest optimizations, only find actual bugs.
If the code is mostly correct, return an empty array.

Return ONLY a JSON object in this exact format:
{
  "bugs": [
    {
      "line": 5,
      "message": "Short description of what is wrong"
    }
  ]
}

Code to analyze:
${code}
  `;

  const response = await fetch(`${url}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false,
      format: 'json'
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();
  let resultText = data.response.trim();
  
  if (resultText.startsWith("\`\`\`json")) {
    resultText = resultText.substring(7);
  }
  if (resultText.startsWith("\`\`\`")) {
    resultText = resultText.substring(3);
  }
  if (resultText.endsWith("\`\`\`")) {
    resultText = resultText.slice(0, -3);
  }

  try {
    const parsed = JSON.parse(resultText.trim());
    return parsed;
  } catch (e) {
    console.error("Failed to parse AI lint response:", e);
    return { bugs: [] };
  }
}
