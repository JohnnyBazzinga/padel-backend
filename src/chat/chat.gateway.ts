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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.data.userId = userId;
      this.connectedUsers.set(userId, client.id);

      client.join(`user:${userId}`);

      this.server.emit('user_online', { userId });

      console.log(`User ${userId} connected`);
    } catch (error) {
      console.error('WebSocket auth error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      this.server.emit('user_offline', { userId });
      console.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; content: string },
  ) {
    const senderId = client.data.userId;

    const message = await this.chatService.sendMessage(
      { receiverId: data.receiverId, content: data.content },
      senderId,
    );

    this.server.to(`user:${data.receiverId}`).emit('new_message', message);
    client.emit('message_sent', message);

    return message;
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; receiverId: string },
  ) {
    const senderId = client.data.userId;
    this.server.to(`user:${data.receiverId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId: senderId,
    });
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; receiverId: string },
  ) {
    const senderId = client.data.userId;
    this.server.to(`user:${data.receiverId}`).emit('user_stop_typing', {
      conversationId: data.conversationId,
      userId: senderId,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; senderId: string },
  ) {
    const userId = client.data.userId;
    await this.chatService.markAsRead(data.conversationId, userId);

    this.server.to(`user:${data.senderId}`).emit('messages_read', {
      conversationId: data.conversationId,
      readBy: userId,
    });
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
