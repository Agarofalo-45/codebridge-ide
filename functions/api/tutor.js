export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { prompt } = await request.json();

    // Run the Llama 3 model provided by Cloudflare AI
    // We use the 8B instruct model which is fast and supports JSON formatting natively
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 2048
    });

    return new Response(JSON.stringify({ response: response.response }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
