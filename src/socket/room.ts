// built-ins
import http from "http";

// third-parties
import {Server as SocketServer} from "socket.io";

// project module
import wsCommonSetting from "../config/wsCommonSetting";

/**
 * 실시간 방 목록 브로드캐스팅 채널
 */
export default function createRoomSocket(httpServer: ReturnType<typeof http.createServer>) {
    const socketServer = new SocketServer(httpServer, {
        ...wsCommonSetting,
        path: '/room'
    });

    // configure : socket server
    socketServer.on('connection', (socket) => {

    });

    return socketServer;
}
