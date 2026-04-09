import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post(':id/join')
  joinRoom(@Param('id') id: string, @Request() req: any) {
    return this.roomsService.joinRoom(id, req.user.id);
  }

  @Delete(':id/leave')
  leaveRoom(@Param('id') id: string, @Request() req: any) {
    return this.roomsService.leaveRoom(id, req.user.id);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string) {
    return this.roomsService.getMessages(id);
  }

  @Post(':id/messages')
  addMessage(@Param('id') id: string, @Body() body: { content: string; type?: string }, @Request() req: any) {
    return this.roomsService.addMessage(id, req.user.id, body.content, body.type);
  }

  @Get(':id/participants')
  getParticipants(@Param('id') id: string) {
    return this.roomsService.getParticipants(id);
  }

  @Get(':id/transcripts')
  getVoiceTranscripts(@Param('id') id: string) {
    return this.roomsService.getVoiceTranscripts(id);
  }

  @Post(':id/transcripts')
  addVoiceTranscript(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Request() req: any
  ) {
    return this.roomsService.addVoiceTranscript(id, req.user.id, body.content);
  }
}