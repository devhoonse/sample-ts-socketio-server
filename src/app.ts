// built-ins
import http from "http";

// third-parties
import express from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';

// project import
import createChattingSocket from "./socket/chat";
import createRoomSocket from "./socket/room";


// server instances
const app = express();
const httpServer = http.createServer(app);
const chattingSocketServer = createChattingSocket(httpServer);
const roomSocketServer = createRoomSocket(httpServer);


// configure : app server
app.use(cors({
    origin: function (requestOrigin, callback) {
        const isAllowedDomain = [
            'https://admin.socket.io',
            'http://chatbot-dev.hunet.ai',
            'http://localhost:3000',
            'http://localhost:8080',
            'http://localhost:1234'
        ].includes(requestOrigin || '');
        callback(null, isAllowedDomain);
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH']
}));
app.get('/welcome', (req, res, next) => {
    res.send('Welcome~!');
});


// configure : http server
httpServer.listen(1234, () => {
    console.log(`
        ################################################
        Server listening on port: 1234
        ################################################
    `);
});
