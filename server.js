const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;

// ─────────────────────────────────────────────
//  HTTP server
// ─────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Therapist WebSocket Server Running');
});

// ─────────────────────────────────────────────
//  WebSocket server
// ─────────────────────────────────────────────
const wss = new WebSocket.Server({ server });

// Connected users
let therapist  = null;
let clientUser = null;

// ── Helper: send JSON to client if online ─────
function sendToClient(payload) {
  if (clientUser && clientUser.readyState === WebSocket.OPEN) {
    clientUser.send(JSON.stringify(payload));
    return true;
  }
  console.log('Client not connected — message dropped:', payload);
  return false;
}

// ── Helper: send JSON to therapist if online ──
function sendToTherapist(payload) {
  if (therapist && therapist.readyState === WebSocket.OPEN) {
    therapist.send(JSON.stringify(payload));
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────
//  Connection handler
// ─────────────────────────────────────────────
wss.on('connection', (ws) => {

  console.log('New connection');

  ws.on('message', (message) => {

    try {

      const data = JSON.parse(message);
      console.log('Received:', data);

      // ── Register therapist ──────────────────
      if (data.type === 'register' && data.role === 'therapist') {
        therapist = ws;
        console.log('✅ Therapist registered');
        sendToTherapist({
          type: 'status',
          clientOnline: clientUser !== null &&
                        clientUser.readyState === WebSocket.OPEN,
        });
        return;
      }

      // ── Register client ─────────────────────
      if (data.type === 'register' && data.role === 'client') {
        clientUser = ws;
        console.log('✅ Client registered');
        sendToTherapist({ type: 'status', clientOnline: true });
        return;
      }

      // ── Guard: only therapist sends commands ─
      if (ws !== therapist) {
        console.log('Ignored message from non-therapist');
        return;
      }

      // ── Video selection ─────────────────────
      // { type:'video', url:'...', action:'play' }
      if (data.type === 'video') {
        const sent = sendToClient({
          type:   'video',
          url:    data.url,
          action: data.action ?? 'play',
        });
        if (sent) console.log('▶ Video sent to client:', data.url);
      }

      // ── Playback controls ───────────────────
      // { type:'control', action:'play'|'pause'|'seek'|'stop'|'end_call', position?: ms }
      if (data.type === 'control') {
        const payload = {
          type:   'control',
          action: data.action,
        };
        if (data.position !== undefined) {
          payload.position = data.position;
        }
        const sent = sendToClient(payload);
        if (sent) console.log(`⏯ Control [${data.action}] → client`);
      }

      // ── UI events ───────────────────────────
      // { type:'ui', action:'take_back'|'pose_question'|'dive_in'|'reward_box'|'let_me_share' }
      if (data.type === 'ui') {
        const sent = sendToClient({
          type:   'ui',
          action: data.action,
        });
        if (sent) console.log(`🖱 UI [${data.action}] → client`);
      }

      // ── Text message ────────────────────────
      // { type:'message', message:'...' }
      if (data.type === 'message') {
        const sent = sendToClient({
          type:    'message',
          from:    'therapist',
          message: data.message,
        });
        if (sent) console.log('💬 Message sent to client');
      }

    } catch (error) {
      console.log('Parse error:', error.message);
    }
  });

  // ── Disconnect handling ───────────────────
  ws.on('close', () => {
    if (ws === therapist) {
      therapist = null;
      console.log('❌ Therapist disconnected');
      sendToClient({ type: 'status', therapistOnline: false });
    }
    if (ws === clientUser) {
      clientUser = null;
      console.log('❌ Client disconnected');
      sendToTherapist({ type: 'status', clientOnline: false });
    }
  });

  ws.on('error', (err) => {
    console.log('WebSocket error:', err.message);
  });
});

// ─────────────────────────────────────────────
//  Start
// ─────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
});
