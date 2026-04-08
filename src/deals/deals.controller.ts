import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { DealsService } from './deals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(private dealsService: DealsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.dealsService.findAll(req.user.id);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.dealsService.findById(id);
  }

  @Post()
  create(@Body() data: { vehicleId: string; sellerId: string }, @Request() req: any) {
    return this.dealsService.create({
      buyerId: req.user.id,
      sellerId: data.sellerId,
      vehicleId: data.vehicleId,
    });
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string; offeredPrice?: number }) {
    return this.dealsService.updateStatus(id, body.status, body.offeredPrice);
  }

  @Post(':id/messages')
  addMessage(@Param('id') id: string, @Body() body: { content: string; type?: string }, @Request() req: any) {
    return this.dealsService.addMessage(id, req.user.id, body.content, body.type);
  }
}