const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 5201;

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight options request
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Only accept POST /proxy endpoint
  if (req.url === '/proxy' && req.method === 'POST') {
    let body = [];
    req.on('data', chunk => {
      body.push(chunk);
    });
    req.on('end', () => {
      body = Buffer.concat(body).toString();
      try {
        const config = JSON.parse(body);
        proxyRequest(config, res);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON config in body' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found. Use POST /proxy' }));
  }
});

function proxyRequest(config, clientRes) {
  const { url: requestUrl, method, headers, body, formDataPayload } = config;
  const startTime = Date.now();

  try {
    const parsedUrl = new URL(requestUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const requestModule = isHttps ? https : http;

    const options = {
      method: method || 'GET',
      headers: headers || {}
    };

    // If body or formDataPayload
    let requestBody = null;
    if (formDataPayload) {
      const boundary = '----TwineBoundary' + Math.random().toString(36).substr(2, 9);
      options.headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
      let parts = [];
      for (const [key, value] of Object.entries(formDataPayload)) {
        parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`);
      }
      parts.push(`--${boundary}--\r\n`);
      requestBody = Buffer.from(parts.join(''));
      options.headers['Content-Length'] = requestBody.length;
    } else if (body) {
      requestBody = Buffer.from(body);
      options.headers['Content-Length'] = requestBody.length;
    }

    const proxyReq = requestModule.request(parsedUrl, options, (res) => {
      let data = [];
      let size = 0;

      res.on('data', (chunk) => {
        data.push(chunk);
        size += chunk.length;
      });

      res.on('end', () => {
        const endTime = Date.now();
        const buffer = Buffer.concat(data);
        const responseBody = buffer.toString('utf-8');

        clientRes.writeHead(200, { 'Content-Type': 'application/json' });
        clientRes.end(JSON.stringify({
          statusCode: res.statusCode,
          time: endTime - startTime,
          size,
          headers: res.headers,
          body: responseBody
        }));
      });
    });

    proxyReq.on('error', (e) => {
      const endTime = Date.now();
      clientRes.writeHead(200, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({
        error: e.message,
        time: endTime - startTime,
        size: 0
      }));
    });

    if (requestBody) {
      proxyReq.write(requestBody);
    }
    proxyReq.end();

  } catch (err) {
    clientRes.writeHead(200, { 'Content-Type': 'application/json' });
    clientRes.end(JSON.stringify({
      error: err.message,
      time: 0,
      size: 0
    }));
  }
}

server.listen(PORT, () => {
  console.log(`Twine CORS Proxy Server is running on port ${PORT}`);
});
