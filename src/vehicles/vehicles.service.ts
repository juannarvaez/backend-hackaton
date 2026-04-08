import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    vin: string;
    make: string;
    model: string;
    year: number;
    price: number;
    mileage: number;
    color: string;
    fuelType: string;
    transmission: string;
    condition: string;
    description?: string;
    images?: string;
    features?: string;
    sellerId: string;
  }) {
    const vehicleData: any = {
      vin: data.vin || '',
      make: data.make,
      model: data.model,
      year: data.year,
      price: data.price,
      mileage: data.mileage || 0,
      color: data.color || '',
      fuelType: data.fuelType || 'GASOLINE',
      transmission: data.transmission || 'AUTOMATIC',
      condition: data.condition || 'GOOD',
      description: data.description || '',
      images: data.images || '',
      features: data.features || '',
      sellerId: data.sellerId,
    };
    
    const vehicle = await this.prisma.vehicle.create({ data: vehicleData });
    await this.generateAIAnalysis(vehicle.id, vehicle.price, vehicle.year, vehicle.mileage, vehicle.condition);
    return vehicle;
  }

  async findAll(status?: string) {
    const where = status ? { status: status as any } : {};
    return this.prisma.vehicle.findMany({
      where,
      include: { seller: { select: { id: true, name: true, email: true } }, aiAnalysis: true },
    });
  }

  async findById(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, email: true, phone: true } },
        aiAnalysis: true,
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async update(id: string, data: any) {
    return this.prisma.vehicle.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.vehicle.delete({ where: { id } });
  }

  private async generateAIAnalysis(vehicleId: string, price: number, year: number, mileage: number, condition: string) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    const avgMileagePerYear = mileage / Math.max(age, 1);
    
    let marketValue = price;
    if (condition === 'EXCELLENT') marketValue *= 1.1;
    else if (condition === 'GOOD') marketValue *= 1.0;
    else if (condition === 'FAIR') marketValue *= 0.85;
    else marketValue *= 0.7;

    if (avgMileagePerYear > 15000) marketValue *= 0.9;
    else if (avgMileagePerYear < 10000) marketValue *= 1.1;

    const priceScore = isNaN(price) || price === 0 ? 50 : Math.min(100, Math.max(0, Math.round(100 - (price - marketValue) / price * 100)));
    
    const insights = [
      avgMileagePerYear > 12000 ? 'Alto kilometraje anual' : 'Kilometraje normal',
      condition === 'EXCELLENT' ? 'Excelente condición' : 'Condición aceptable',
      price > marketValue ? 'Precio ligeramente alto' : 'Precio competitivo',
    ].join('. ');

    const recommendations = priceScore > 80 
      ? 'Precio atractivo para negociar'
      : 'Considere ajustar el precio';

    await this.prisma.aIAnalysis.create({
      data: {
        vehicleId,
        marketValue: Math.round(marketValue),
        priceScore,
        recommendations,
        insights,
      },
    });
  }
}