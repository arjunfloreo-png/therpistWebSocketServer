const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('1-to-1 Therapist WebSocket Server Running');
});

const wss = new WebSocket.Server({ server });

// SINGLE CONNECTIONS ONLY
let therapist = null;
let client = null;

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on('connection', (ws) => {
  console.log('New connection');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // -----------------------
      // REGISTER THERAPIST
      // -----------------------
      if (data.type === 'register' && data.role === 'therapist') {
        therapist = ws;
        ws.role = 'therapist';

        console.log('Therapist connected');
        return;
      }

      // -----------------------
      // REGISTER CLIENT
      // -----------------------
      if (data.type === 'register' && data.role === 'client') {
        client = ws;
        ws.role = 'client';

        console.log('Client connected');
        return;
      }

      // -----------------------
      // VIDEO (THERAPIST → CLIENT)
      // -----------------------
      if (data.type === 'video' && ws === therapist) {
        if (client) {
          send(client, {
            type: 'video',
            url: data.url,
          });

          console.log('Video sent to client');
        }
        return;
      }

      // -----------------------
      // REACTION (THERAPIST → CLIENT)
      // -----------------------
      if (data.type === 'reaction' && ws === therapist) {
        if (client) {
          send(client, {
            type: 'reaction',
            emoji: data.emoji,
            label: data.label,
          });

          console.log('Reaction sent to client');
        }
        return;
      }

    } catch (err) {
      console.log('Error:', err.message);
    }
  });

  ws.on('close', () => {
    if (ws === therapist) {
      therapist = null;
      console.log('Therapist disconnected');
    }

    if (ws === client) {
      client = null;
      console.log('Client disconnected');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});