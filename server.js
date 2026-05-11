const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;

// HTTP server
const server = http.createServer((req, res) => {

  res.writeHead(200, {
    'Content-Type': 'text/plain',
  });

  res.end('Therapist WebSocket Server Running');
});

// WebSocket server
const wss = new WebSocket.Server({ server });

// Store users
let therapist = null;
let clientUser = null;

wss.on('connection', (ws) => {

  console.log('New connection');

  ws.on('message', (message) => {

    try {

      const data = JSON.parse(message);

      console.log('Received:', data);

      // Register therapist
      if (
        data.type === 'register' &&
        data.role === 'therapist'
      ) {

        therapist = ws;

        console.log('Therapist registered');

        return;
      }

      // Register client
      if (
        data.type === 'register' &&
        data.role === 'client'
      ) {

        clientUser = ws;

        console.log('Client registered');

        return;
      }

      // Therapist sends message
      if (
        data.type === 'message' &&
        ws === therapist
      ) {

        if (
          clientUser &&
          clientUser.readyState === WebSocket.OPEN
        ) {

          clientUser.send(JSON.stringify({
            type: 'message',
            from: 'therapist',
            message: data.message
          }));

          console.log('Message sent to client');
        }
      }

      // Therapist sends video
      if (
        data.type === 'video' &&
        ws === therapist
      ) {

        if (
          clientUser &&
          clientUser.readyState === WebSocket.OPEN
        ) {

          clientUser.send(JSON.stringify({
            type: 'video',
            url: data.url
          }));

          console.log('Video sent to client');
        }
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

  console.log(
    `WebSocket server running on port ${PORT}`
  );
});