import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DealsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { buyerId: string; sellerId: string; vehicleId: string }) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const deal = await this.prisma.deal.create({
      data: {
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        vehicleId: data.vehicleId,
      },
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
        vehicle: true,
      },
    });

    await this.prisma.room.create({
      data: {
        name: `Deal: ${vehicle.make} ${vehicle.model}`,
        dealId: deal.id,
      },
    });

    return deal;
  }

  async findAll(userId: string) {
    return this.prisma.deal.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
        vehicle: true,
        room: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        seller: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: { include: { aiAnalysis: true, seller: true } },
        room: true,
        messages: { include: { sender: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async updateStatus(id: string, status: string, offeredPrice?: number) {
    const data: any = { status: status as any };
    if (offeredPrice) data.offeredPrice = offeredPrice;
    if (status === 'ACCEPTED') data.completedAt = new Date();
    return this.prisma.deal.update({ where: { id }, data });
  }

  async addMessage(dealId: string, senderId: string, content: string, type: string = 'TEXT') {
    return this.prisma.message.create({
      data: { dealId, senderId, content, type: type as any },
      include: { sender: true },
    });
  }
}