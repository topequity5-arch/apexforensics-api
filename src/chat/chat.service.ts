// src/chat/chat.service.ts
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // Removed createThread. Independent threads are no longer permitted.

  async getThreads(userId: string, role: string) {
    console.log(userId);
    // If client, fetch thread matching their claims context profile mapping structure
    let query = this.supabaseService.client
      .from('chat_threads')
      .select('*, claims!inner(*)');

    if (role !== 'admin') {
      query = query.eq('claims.client_id', userId);
    }

    const { data, error } = await query.order('updated_at', {
      ascending: false,
    });
    if (error) throw error;
    return data;
  }

  async getMessages(userId: string, role: string, threadId: string) {
    await this.verifyThreadAccess(userId, role, threadId);

    const { data, error } = await this.supabaseService.client
      .from('chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async sendMessage(
    userId: string,
    role: string,
    threadId: string,
    dto: SendMessageDto,
  ) {
    await this.verifyThreadAccess(userId, role, threadId);

    const { data, error } = await this.supabaseService.client
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        sender_id: userId,
        sender_role: role,
        message: dto.message,
      })
      .select()
      .single();

    if (error) throw error;

    await this.supabaseService.client
      .from('chat_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);

    return data;
  }

  async verifyThreadAccess(userId: string, role: string, threadId: string) {
    if (role === 'admin') return;

    // Joins parent claims to verify if the client owns the corresponding target claim context
    const { data: thread, error } = await this.supabaseService.client
      .from('chat_threads')
      .select('claim_id, claims (client_id)')
      .eq('id', threadId)
      .single();

    if (error || !thread)
      throw new NotFoundException('Chat thread context footprint not found');

    const claimOwnerId = (thread.claims as any)?.client_id;
    if (claimOwnerId !== userId) {
      throw new ForbiddenException(
        'Access denied to this claim thread context window.',
      );
    }
  }

  verifyWebSocketToken(token: string) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(base64, 'base64').toString());

      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.app_metadata?.role || 'client',
      };
    } catch (error) {
      throw new Error('Unauthorized WebSocket token handshake');
    }
  }
}
