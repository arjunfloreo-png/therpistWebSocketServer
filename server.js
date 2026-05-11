const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;

// HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Therapist WebSocket Server Running');
});

// WebSocket server
const wss = new WebSocket.Server({ server });

// Store users
let therapist = null;
let clientUser = null;

// Helper — send JSON to client if connected
function sendToClient(payload) {
  if (clientUser && clientUser.readyState === WebSocket.OPEN) {
    clientUser.send(JSON.stringify(payload));
    return true;
  }
  return false;
}

wss.on('connection', (ws) => {

  console.log('New connection');

  ws.on('message', (message) => {

    try {

      const data = JSON.parse(message);
      console.log('Received:', data);

      // ── Register therapist ──────────────────
      if (data.type === 'register' && data.role === 'therapist') {
        therapist = ws;
        console.log('Therapist registered');
        return;
      }

      // ── Register client ─────────────────────
      if (data.type === 'register' && data.role === 'client') {
        clientUser = ws;
        console.log('Client registered');
        return;
      }

      // ── Only therapist can send commands below ──
      if (ws !== therapist) return;

      // ── Text message ────────────────────────
      if (data.type === 'message') {
        const sent = sendToClient({
          type: 'message',
          from: 'therapist',
          message: data.message,
        });
        if (sent) console.log('Message sent to client');
      }

      // ── Video selection ─────────────────────
      if (data.type === 'video') {
        const sent = sendToClient({
          type: 'video',
          url: data.url,
          action: data.action ?? 'play',   // default to play
        });
        if (sent) console.log('Video sent to client:', data.url);
      }

      // ── Playback controls ───────────────────
      // actions: play | pause | seek | stop | end_call
      if (data.type === 'control') {
        const payload = {
          type: 'control',
          action: data.action,
        };

        // include seek position when present
        if (data.position !== undefined) {
          payload.position = data.position;
        }

        const sent = sendToClient(payload);
        if (sent) console.log(`Control [${data.action}] sent to client`);
      }

      // ── UI events (take_back, dive_in, etc.) ─
      if (data.type === 'ui') {
        const sent = sendToClient({
          type: 'ui',
          action: data.action,
        });
        if (sent) console.log(`UI action [${data.action}] sent to client`);
      }

    } catch (error) {
      console.log('Error:', error.message);
    }
  });

  ws.on('close', () => {
    if (ws === therapist) {
      therapist = null;
      console.log('Therapist disconnected');
    }
    if (ws === clientUser) {
      clientUser = null;
      console.log('Client disconnected');
    }
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
