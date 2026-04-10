import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>();

  constructor(private prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const userId = this.getUserIdFromSocket(client);
    if (userId) {
      this.userSockets.delete(userId);
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  private getUserIdFromSocket(client: Socket): string | null {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) return userId;
    }
    return null;
  }

  @SubscribeMessage('authenticate')
  handleAuth(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string }) {
    this.userSockets.set(data.userId, client.id);
    client.join(`user:${data.userId}`);
    return { status: 'authenticated' };
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    console.log('join-room received from', client.id, 'roomId:', data.roomId, 'userId:', data.userId)
    client.join(data.roomId);
    client.to(data.roomId).emit('user-joined', { userId: data.userId, socketId: client.id });
    return { status: 'joined' };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    client.leave(data.roomId);
    client.to(data.roomId).emit('user-left', { userId: data.userId });
  }

  @SubscribeMessage('chat-message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; content: string },
  ) {
    console.log('chat-message received from', client.id, 'roomId:', data.roomId)
    const sender = await this.prisma.user.findUnique({ where: { id: data.userId } });
    const message = await this.prisma.roomMessage.create({
      data: {
        roomId: data.roomId,
        senderId: data.userId,
        content: data.content,
      },
      include: { sender: { select: { id: true, name: true } } },
    });

    this.server.to(data.roomId).emit('chat-message', message);
    return message;
  }

  @SubscribeMessage('webrtc-offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string; offer: RTCSessionDescriptionInit },
  ) {
    const targetSocketId = this.userSockets.get(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('webrtc-offer', {
        offer: data.offer,
        from: client.id,
      });
    }
  }

  @SubscribeMessage('webrtc-answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetSocketId: string; answer: RTCSessionDescriptionInit },
  ) {
    this.server.to(data.targetSocketId).emit('webrtc-answer', {
      answer: data.answer,
      from: client.id,
    });
  }

  @SubscribeMessage('webrtc-ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string; candidate: RTCIceCandidateInit },
  ) {
    const targetSocketId = this.userSockets.get(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('webrtc-ice-candidate', {
        candidate: data.candidate,
        from: client.id,
      });
    }
  }

  @SubscribeMessage('call-user')
  handleCallUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string },
  ) {
    const targetSocketId = this.userSockets.get(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('incoming-call', {
        roomId: data.roomId,
        from: client.id,
      });
    }
  }

  @SubscribeMessage('accept-call')
  handleAcceptCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetSocketId: string },
  ) {
    this.server.to(data.targetSocketId).emit('call-accepted', {
      roomId: data.roomId,
    });
  }

  @SubscribeMessage('end-call')
  handleEndCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string },
  ) {
    const targetSocketId = this.userSockets.get(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('call-ended');
    }
  }

  @SubscribeMessage('vehicle-tab-change')
  handleVehicleTabChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; tab: string },
  ) {
    client.to(data.roomId).emit('vehicle-tab-change', { tab: data.tab });
  }

  @SubscribeMessage('vehicle-image-selected-change')
  handleVehicleImageSelectedChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; imageIndex: number },
  ) {
    client.to(data.roomId).emit('vehicle-image-selected-change', { imageIndex: data.imageIndex });
  }


  @SubscribeMessage('voice-transcript')
  async handleVoiceTranscript(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; content: string },
  ) {
    const sender = await this.prisma.user.findUnique({ where: { id: data.userId } });
    const transcript = await this.prisma.voiceTranscript.create({
      data: {
        roomId: data.roomId,
        senderId: data.userId,
        content: data.content,
      },
      include: { sender: { select: { id: true, name: true } } },
    });

    this.server.to(data.roomId).emit('voice-transcript', transcript);
    return transcript;
  }
}