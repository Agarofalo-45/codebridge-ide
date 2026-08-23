export async function executeCode(language, code) {
  // Map our UI languages to Piston runtimes
  const langMap = {
    'python': { language: 'python', version: '3.10.0' },
    'javascript': { language: 'javascript', version: '18.15.0' },
    'java': { language: 'java', version: '15.0.2' },
    'csharp': { language: 'csharp', version: '6.12.0' },
    'cpp': { language: 'c++', version: '10.2.0' }
  };

  const runtime = langMap[language.toLowerCase()] || langMap['python'];

  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [
          {
            content: code
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to execute code: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.run) {
      return {
        output: data.run.stdout,
        error: data.run.stderr,
        code: data.run.code
      };
    } else {
      return { output: '', error: data.message || 'Execution failed', code: 1 };
    }
  } catch (err) {
    return { output: '', error: err.message, code: 1 };
  }
}
