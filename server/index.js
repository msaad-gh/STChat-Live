const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Production CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(null, true); // Allow all for now, tighten in production
        }
    }
}));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// In-memory stores
let messages = [];
// E2EE: roomKey removed from server - server is now Zero-Knowledge

// Helper to broadcast connected users
const broadcastUserList = () => {
    const users = [];
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.username) {
            users.push(client.username);
        }
    });

    const broadcastMsg = JSON.stringify({
        type: 'userList',
        users: users
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastMsg);
        }
    });
};

// WebSocket Logic
wss.on('connection', (ws) => {
    console.log('New client connected');

    // NOTE: History is sent AFTER room key during join event (not here)
    // This ensures the client has the decryption key before receiving encrypted messages

    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);

            // Handle different message types
            if (parsedMessage.type === 'typing') {
                const broadcastMsg = JSON.stringify({
                    type: 'typing',
                    user: parsedMessage.user,
                    isTyping: parsedMessage.isTyping
                });

                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(broadcastMsg);
                    }
                });
                return;
            }

            if (parsedMessage.type === 'join') {
                const requestedUser = parsedMessage.user;

                // Check if username is already taken
                let isTaken = false;
                wss.clients.forEach((client) => {
                    if (client.username === requestedUser && client.readyState === WebSocket.OPEN) {
                        isTaken = true;
                    }
                });

                if (isTaken) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        code: 'USERNAME_TAKEN',
                        message: `Username '${requestedUser}' is already in use. Please choose another.`
                    }));
                    return;
                }

                ws.username = requestedUser;
                console.log(`${requestedUser} joined successfully`);

                // Send history immediately (Client derives key locally now)
                ws.send(JSON.stringify({ type: 'history', payload: messages }));

                const sysMsg = {
                    type: 'system',
                    text: `${parsedMessage.user} joined the chat`,
                    timestamp: new Date().toISOString()
                };
                const broadcastMsg = JSON.stringify(sysMsg);

                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(broadcastMsg);
                    }
                });

                broadcastUserList();
                return;
            }


            if (parsedMessage.type === 'delete_message') {
                const msgId = parsedMessage.id;
                const user = parsedMessage.user;

                const msgIndex = messages.findIndex(m => m.id === msgId && m.user === user);
                if (msgIndex !== -1) {
                    messages.splice(msgIndex, 1);

                    const historyUpdateMsg = JSON.stringify({
                        type: 'history_update',
                        payload: messages
                    });

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(historyUpdateMsg);
                        }
                    });
                }
                return;
            }

            if (parsedMessage.type === 'react') {
                const { msgId, emoji, user } = parsedMessage;
                const msgIndex = messages.findIndex(m => m.id === msgId);

                if (msgIndex !== -1) {
                    const msg = messages[msgIndex];
                    if (!msg.reactions) msg.reactions = {};

                    // 1. Find and remove existing reaction by this user (if any)
                    let sameEmoji = false;
                    Object.keys(msg.reactions).forEach(e => {
                        const idx = msg.reactions[e].indexOf(user);
                        if (idx !== -1) {
                            if (e === emoji) {
                                sameEmoji = true;
                            }
                            msg.reactions[e].splice(idx, 1);
                            if (msg.reactions[e].length === 0) {
                                delete msg.reactions[e];
                            }
                        }
                    });

                    // 2. Add new reaction if it wasn't the same one (toggle effect)
                    if (!sameEmoji) {
                        if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
                        msg.reactions[emoji].push(user);
                    }

                    const reactionUpdateMsg = JSON.stringify({
                        type: 'reaction_update',
                        msgId,
                        reactions: messages[msgIndex].reactions
                    });

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(reactionUpdateMsg);
                        }
                    });
                }
                return;
            }

            // E2EE: Message is already encrypted by client
            // Server just relays the encrypted payload
            const incomingMsg = {
                id: Date.now(),
                user: parsedMessage.user || 'Anonymous',
                text: parsedMessage.text, // Encrypted ciphertext
                iv: parsedMessage.iv, // Initialization vector for decryption
                replyTo: parsedMessage.replyTo, // Also encrypted if present
                timestamp: new Date().toISOString(),
            };

            messages.push(incomingMsg);

            const broadcastMsg = JSON.stringify({ type: 'message', payload: incomingMsg });
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(broadcastMsg);
                }
            });
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (ws.username) {
            messages = messages.filter(msg => msg.user !== ws.username);

            const sysMsg = {
                type: 'system',
                text: `${ws.username} left the chat`,
                timestamp: new Date().toISOString()
            };
            const broadcastMsg = JSON.stringify(sysMsg);

            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(broadcastMsg);
                }
            });

            const historyUpdateMsg = JSON.stringify({
                type: 'history_update',
                payload: messages
            });

            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(historyUpdateMsg);
                }
            });

            broadcastUserList();

            // Reset messages if no users left
            if (wss.clients.size === 0) {
                messages = [];
                console.log('Room reset - all users left');
            }
        }
    });
});

app.get('/', (req, res) => {
    res.send('STChat Server is running');
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start Server
server.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});
