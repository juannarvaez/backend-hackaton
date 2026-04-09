import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async joinRoom(roomId: string, userId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const existing = await this.prisma.roomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (existing) return existing;

    const isHost = (await this.prisma.roomParticipant.count({ where: { roomId } })) === 0;
    
    return this.prisma.roomParticipant.create({
      data: { roomId, userId, isHost },
    });
  }

  async leaveRoom(roomId: string, userId: string) {
    await this.prisma.roomParticipant.delete({
      where: { roomId_userId: { roomId, userId } },
    });
  }

  async getMessages(roomId: string) {
    return this.prisma.roomMessage.findMany({
      where: { roomId },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMessage(roomId: string, senderId: string, content: string, type: string = 'TEXT') {
    return this.prisma.roomMessage.create({
      data: { roomId, senderId, content, type: type as any },
      include: { sender: { select: { id: true, name: true } } },
    });
  }

  async getParticipants(roomId: string) {
    return this.prisma.roomParticipant.findMany({
      where: { roomId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async updateStatus(roomId: string, status: string) {
    return this.prisma.room.update({ where: { id: roomId }, data: { status: status as any } });
  }

  async getVoiceTranscripts(roomId: string) {
    return this.prisma.voiceTranscript.findMany({
      where: { roomId },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addVoiceTranscript(roomId: string, senderId: string, content: string) {
    return this.prisma.voiceTranscript.create({
      data: { roomId, senderId, content },
      include: { sender: { select: { id: true, name: true } } },
    });
  }
}