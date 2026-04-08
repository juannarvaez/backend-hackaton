import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getRoomChatHistory(roomId: string) {
    return this.prisma.roomMessage.findMany({
      where: { roomId },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  async saveMessage(roomId: string, senderId: string, content: string) {
    return this.prisma.roomMessage.create({
      data: { roomId, senderId, content },
      include: { sender: { select: { id: true, name: true } } },
    });
  }
}