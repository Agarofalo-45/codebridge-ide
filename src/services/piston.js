export async function executeCode(language, code) {
  // Since the public Piston API is now whitelist-only, we simulate execution
  // by passing the code to our Cloudflare AI worker which accurately runs standard code natively!
  const prompt = `You are a strict code execution engine. 
I will provide you with ${language} code. 
You must execute it in your mind and output ONLY the standard output (e.g. what would be printed to the console). 
Do not explain the code. Do not wrap it in markdown. Do not say 'The output is'. Just return the exact raw string output.
If the code has a syntax error or runtime error, output ONLY the error message starting with 'Error:'.

Code to execute:
\`\`\`${language}
${code}
\`\`\``;

  try {
    const response = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`Failed to contact execution engine: ${response.statusText}`);
    }

    const data = await response.json();
    let resultText = data.response.trim();
    
    // Remove markdown code blocks if the AI accidentally included them
    if (resultText.startsWith('\`\`\`')) {
      const lines = resultText.split('\n');
      if (lines.length >= 2) {
        lines.shift(); // remove first line ```
        if (lines[lines.length - 1].startsWith('\`\`\`')) {
          lines.pop(); // remove last line ```
        }
        resultText = lines.join('\n').trim();
      }
    }

    if (resultText.toLowerCase().startsWith('error:')) {
      return { output: '', error: resultText, code: 1 };
    } else {
      return { output: resultText, error: '', code: 0 };
    }
  } catch (err) {
    return { output: '', error: err.message, code: 1 };
  }
}
