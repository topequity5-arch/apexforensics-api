/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import type { AuthenticatedRequest } from '../auth/interface/authenticated-request.interface';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Chat Engine')
@ApiBearerAuth('JWT-auth')
@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Fetch thread communications logs matching context identity
   */
  @Get('threads')
  async getThreads(@Req() req: AuthenticatedRequest) {
    return this.chatService.getThreads(req.user.id, req.user.role);
  }

  /**
   * Load history logs for a specific chat room context
   */
  @Get('threads/:threadId/messages')
  async getMessages(
    @Req() req: AuthenticatedRequest,
    @Param('threadId') threadId: string,
  ) {
    return this.chatService.getMessages(req.user.id, req.user.role, threadId);
  }

  /**
   * Persist an individual communication transaction entry
   */
  @Post('threads/:threadId/messages')
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('threadId') threadId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(
      req.user.id,
      req.user.role,
      threadId,
      dto,
    );
  }
}
