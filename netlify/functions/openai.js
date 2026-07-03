const https = require('https');

exports.handler = async function (event, context) {
  // Only allow POST requests for this proxy
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OPENROUTER_API_KEY not configured on server' }),
    };
  }

  return new Promise((resolve, reject) => {
    // Determine the target OpenRouter path
    // e.g., if the client calls /api/openai/chat/completions
    // and we proxy it to https://openrouter.ai/api/v1/chat/completions
    
    // We expect the client to hit /api/openai/... and we rewrite to /api/v1/...
    // Let's grab the path after /api/openai/ or just hardcode the base if we only use chat/completions
    // A simple Netlify redirect rules pass the whole path or just the splat.
    // If our netlify.toml is: 
    // [[redirects]]
    //   from = "/api/openai/*"
    //   to = "/.netlify/functions/openai/:splat"
    //   status = 200
    // Then event.path might be "/.netlify/functions/openai/chat/completions"
    
    // Let's just safely replace everything before /chat/completions or whatever.
    // Actually, we can just proxy everything to /api/v1/...
    const targetPath = event.path.replace(/^.*\/openai/, '/api/v1');

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: targetPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://spotify-ai-discovery.netlify.app',
        'X-Title': 'Spotify AI Discovery',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: {
            'Content-Type': 'application/json',
            // Pass along rate limit headers if OpenRouter provides them
          },
          body: body,
        });
      });
    });

    req.on('error', (e) => {
      console.error(e);
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to proxy request to OpenRouter' }),
      });
    });

    // Write the original request body to the proxy request
    if (event.body) {
      req.write(event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body);
    }
    
    req.end();
  });
};
