/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { ChatService } from './chat.service';

// Configured with CORS enabled so your frontend application can connect smoothly
@WebSocketGateway({
  cors: {
    origin: '*', // Adjust this to your specific frontend URL in production
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly chatService: ChatService) {}

  /**
   * Validates and hooks up incoming connection requests.
   * Expects the auth token to be passed inside the handshake connection metadata.
   */
  handleConnection(client: Socket) {
    try {
      // 1. Extract token from handshake authorization header or query string
      const token =
        client.handshake.headers.authorization?.split(' ')[1] ||
        (client.handshake.query['token'] as string);

      if (!token) {
        client.disconnect();
        return;
      }

      // 2. Decode/validate token via your passport logic or direct extraction
      // For this example, we mock appending it. Ensure your gateway decodes the user profile:
      const user = this.chatService.verifyWebSocketToken(token);

      // Store user data directly on the client socket context memory socket session instance
      client.data.user = user;

      console.log(
        `🚀 Client Connected to WebSocket: ${user.userId} (${user.role})`,
      );
    } catch (err) {
      console.error('WebSocket connection authentication rejected:', err);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`🔌 Client disconnected from WebSocket: ${client.id}`);
  }

  /**
   * Stream room joining command setup.
   * Allows the frontend to step into a specific threat communication stream.
   */
  @SubscribeMessage('joinThread')
  async handleJoinThread(
    @ConnectedSocket() client: Socket,
    @MessageBody('threadId') threadId: string,
  ) {
    const user = client.data.user;

    // Securely verify if this specific user has rights to peek into this room context
    await this.chatService.verifyThreadAccess(user.userId, user.role, threadId);

    // Socket.io room binding syntax
    await client.join(threadId);
    console.log(`👤 User ${user.userId} joined chat room thread: ${threadId}`);

    // Optional: Emit confirmation down to the connected user channel
    client.emit('joinedRoom', { threadId });
  }

  /**
   * Processes incoming back and forth message transmissions cleanly over the socket tunnel.
   */
  @UsePipes(new ValidationPipe())
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string; message: string },
  ) {
    const user = client.data.user;

    // Invokes message storage using streamlined parameters
    const savedMessage = await this.chatService.sendMessage(
      user.userId,
      user.role,
      data.threadId,
      { message: data.message },
    );

    this.server.to(data.threadId).emit('messageReceived', savedMessage);
  }
}
