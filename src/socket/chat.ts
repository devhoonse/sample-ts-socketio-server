// built-ins
import http from "http";

// third-parties
import {Server as SocketServer} from "socket.io";

// project module
import wsCommonSetting from "../config/wsCommonSetting";
import { RoomProfile, RoomList } from "../types/Room";

/**
 * 기본 대기실 정보
 */
const waitingRoomInfo: RoomProfile = {
    id: 'global',
    name: 'Global',
    lastMessage: 'last',
    status: 'active',
    userCount: 0
};

/**
 * 실시간 채팅 채널
 */
export default function createChattingSocket(httpServer: ReturnType<typeof http.createServer>) {

    /**
     * 현재 소켓 서버에 개설된 방 목록 정보
     */
    let roomList: RoomList = [];

    /**
     * 웹 소켓 서버 구동
     */
    const socketServer = new SocketServer(httpServer, {
        ...wsCommonSetting,
        path: '/socket.io'
    });

    // configure : socket server
    socketServer.on('connection', (socket) => {

        const { user_id, room_id } = socket.handshake.auth;

        /**
         * 현재 클라이언트 소켓이 입장 중인 방 ID 정보
         */
        let currentRoomId: string | null = null;

        console.log('connection from : ', socket);
        socket.data = { user_id, room_id };
        socket.join(room_id);

        // /**
        //  * [emit] greeting
        //  * - 클라이언트 최초 연결 시 환영 인사 전송
        //  */
        // socket.emit('greeting', JSON.stringify({
        //     answer: '안녕하세요 ! 저는 똑똑한 챗봇입니다 :)',
        //     state: 'SUCCESS'
        // }));

        /**
         * [emit] change_rooms
         * - 클라이언트 최초 연결 시 현재 개설된 방 목록 전송
         */
        socketServer.sockets.emit('change_rooms', getPublicRooms(socketServer, roomList));

        /**
         * [on] create_room
         * - 방 개설 시 클라이언트로부터 수신되는 이벤트
         */
        socket.on('create_room', (payload) => {
            const payloadParsed = JSON.parse(payload);
            const {
                id,
                name,
                lastMessage,
                status,
                unreadChatCount
            } = payloadParsed;
            currentRoomId = id;
            socket.join(id);
            socket.data = payloadParsed;
            roomList.push({
                ...payloadParsed,
                sid: socket.id
            });
            socket.emit('create_room_success', payload);
            socketServer.sockets.emit('change_rooms', getPublicRooms(socketServer, roomList));
            console.group('room created');
            console.log('socket : ', socket);
            console.log('roomId: ', id);
            console.groupEnd();
        });

        /**
         * [on] join_room
         * - 방 입장 처리
         * - 방 목록 변동 이벤트 브로드캐스팅
         */
        socket.on('join_room', (payload) => {
            const {
                id: roomId,
                name,
                clientName,
                lastMessage,
                status,
                unreadChatCount
            } = payload;
            currentRoomId = roomId || room_id;
            socket.join(roomId);
            socket.data = payload;
            socket.to(roomId).emit('message', JSON.stringify({
                roomId,
                from: '(SYSTEM)',
                // to: user.name,
                text: `입장 : ${clientName} (${socket.id})`,
            }));
            roomList = roomList.map((room) => room.id !== 'global' ? room : { ...room, sid: socket.id });
            socketServer.sockets.emit('change_rooms', getPublicRooms(socketServer, roomList));
            console.group('room joined');
            console.log('socket : ', socket);
            console.log('roomId: ', roomId);
            console.groupEnd();
        });

        /**
         * [on] leave_room
         * - 방 퇴실 처리
         * - 방 목록 변동 이벤트 브로드캐스팅
         */
        socket.on('leave_room', (roomId) => {
            socket.leave(roomId);
            socket.to(roomId).emit('message', JSON.stringify({
                roomId,
                from: '(SYSTEM)',
                // to: user.name,
                text: `퇴실 : ${socket.data.clientName} (${socket.id})`,
            }));
            socketServer.sockets.emit('change_rooms', getPublicRooms(socketServer, roomList));
        });

        /**
         * [on] disconnect
         * - 웹 소켓 연결 종료 시 실행
         * - 방 퇴실 처리
         */
        socket.on('disconnecting', () => {
            console.log('connection closing ... : ', socket);
        });
        socket.on('disconnect', (reason) => {
            const {
                roomId
            } = socket.data;
            console.log('connection closed : ', socket);
            socket.leave(currentRoomId || room_id as string);
            socket.to(roomId).emit('message', JSON.stringify({
                roomId,
                from: '(SYSTEM)',
                // to: user.name,
                text: `퇴실 : ${socket.data.user_id} (${socket.id})`,
            }));
            socketServer.sockets.emit('change_rooms', getPublicRooms(socketServer, roomList));
        });

        // /**
        //  * [on] receive message from client
        //  * - 채팅 브로드캐스팅 (현재 참여 중인 방에만)
        //  */
        // socket.on('on_message', (message) => {
        //     const messageParsed = JSON.parse(message);
        //     console.group('broadcast');
        //     console.log('currentRoomId : ', messageParsed.roomId);
        //     console.log('message : ', message);
        //     console.groupEnd();
        //     socket.to(messageParsed.roomId).emit('on_message', message);
        // });

        /**
         * [on] receive message from client
         * - 채팅 브로드캐스팅 (현재 참여 중인 방에만)
         */
        socket.on('message', (message) => {
            const messageParsed = JSON.parse(message);
            console.group('broadcast');
            console.log('currentRoomId : ', messageParsed.roomId);
            console.log('message : ', message);
            console.groupEnd();
            socket.to(messageParsed.roomId).emit('message', message);
        });

        /**
         * [on] receive message from client
         * - 채팅 브로드캐스팅 (현재 참여 중인 방에만)
         */
        socket.on('on_message', (message) => {
            console.group('broadcast');
            console.log('currentRoomId : ', message.roomId || message.room_id);
            console.log('message : ', message);
            console.groupEnd();
            socket.to(message.roomId || message.room_id).emit('on_message', message);
        });
    });

    // /**
    //  * socket.io Admin 서버 추가
    //  */
    // instrument(socketServer, {
    //     namespaceName: '/admin',
    //     readonly: true,
    //     auth: false
    // });

    return socketServer;
}

/**
 * 방 목록 변동 시 공개 방 목록을 파악하기 위한 함수
 */
function getPublicRooms(socketServer: SocketServer, roomList: RoomList) {
    const publicRooms: string[] = [];
    const {
        sockets: {
            adapter: {
                sids, rooms
            }
        }
    } = socketServer;
    rooms.forEach((_, key) => {
        if (sids.get(key) === undefined)
            publicRooms.push(key);
    });
    return [
        {
            ...waitingRoomInfo,
            userCount: rooms.get(`${waitingRoomInfo.id}`)?.size || 0
        },
        ...roomList.filter((room) =>
            publicRooms.map(publicRoomId =>
                `${publicRoomId}`
            ).includes(room.id)
        ).map((room) => ({
            ...room,
            userCount: rooms.get(room.id)?.size || 0
        }))
    ];
}
