const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('WebSocket server running');
});

const wss = new WebSocket.Server({ server });

let therapist = null;
let clientUser = null;

wss.on('connection', (ws) => {

  console.log('Connected');

  ws.on('message', (message) => {

    const data = JSON.parse(message);

    // Register therapist
    if (data.type === 'register' && data.role === 'therapist') {
      therapist = ws;
      console.log('Therapist registered');
      return;
    }

    // Register client
    if (data.type === 'register' && data.role === 'client') {
      clientUser = ws;
      console.log('Client registered');
      return;
    }

    // Therapist sends message to client only
    if (data.type === 'message' && ws === therapist) {

      if (
        clientUser &&
        clientUser.readyState === WebSocket.OPEN
      ) {
        clientUser.send(JSON.stringify({
          from: 'therapist',
          message: data.message
        }));
      }

    }

  });

  ws.on('close', () => {

    if (ws === therapist) therapist = null;
    if (ws === clientUser) clientUser = null;

    console.log('Disconnected');
  });

});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Running on port ${PORT}`);
});