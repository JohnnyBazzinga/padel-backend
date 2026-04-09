import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('EMAIL_API_KEY');

    if (apiKey && apiKey !== 're_xxxxxxxxxxxxx') {
      this.resend = new Resend(apiKey);
    }

    const fromName = this.configService.get<string>('EMAIL_FROM_NAME') || 'Padel App';
    const fromEmail = this.configService.get<string>('EMAIL_FROM') || 'noreply@padelapp.pt';
    this.from = `${fromName} <${fromEmail}>`;
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2E7D32, #4CAF50); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Padel App</h1>
          </div>
          <div class="content">
            <h2>Olá ${name}!</h2>
            <p>Recebemos um pedido para redefinir a sua password.</p>
            <p>Clique no botão abaixo para criar uma nova password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Redefinir Password</a>
            </p>
            <p>Este link é válido por 24 horas.</p>
            <p>Se não pediu a redefinição da password, ignore este email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Padel App. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, 'Redefinir Password - Padel App', html);
  }

  async sendBookingConfirmationEmail(
    email: string,
    name: string,
    bookingDetails: {
      clubName: string;
      courtName: string;
      date: string;
      startTime: string;
      endTime: string;
      price: string;
    },
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2E7D32, #4CAF50); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2E7D32; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reserva Confirmada!</h1>
          </div>
          <div class="content">
            <h2>Olá ${name}!</h2>
            <p>A sua reserva foi confirmada com sucesso.</p>
            <div class="booking-details">
              <div class="detail-row"><strong>Clube:</strong> <span>${bookingDetails.clubName}</span></div>
              <div class="detail-row"><strong>Campo:</strong> <span>${bookingDetails.courtName}</span></div>
              <div class="detail-row"><strong>Data:</strong> <span>${bookingDetails.date}</span></div>
              <div class="detail-row"><strong>Horário:</strong> <span>${bookingDetails.startTime} - ${bookingDetails.endTime}</span></div>
              <div class="detail-row"><strong>Preço:</strong> <span>${bookingDetails.price}</span></div>
            </div>
            <p>Bom jogo!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Padel App. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, 'Reserva Confirmada - Padel App', html);
  }

  async sendMatchInviteEmail(
    email: string,
    inviterName: string,
    matchDetails: {
      date: string;
      time: string;
      location: string;
      level: string;
    },
    token: string,
  ): Promise<void> {
    const inviteUrl = `${this.frontendUrl}/matches/invite/${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2E7D32, #4CAF50); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .match-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2E7D32; }
          .button { display: inline-block; background: #2E7D32; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
          .button-secondary { background: #666; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Convite para Jogo</h1>
          </div>
          <div class="content">
            <h2>Novo convite!</h2>
            <p><strong>${inviterName}</strong> convidou-te para um jogo de Padel.</p>
            <div class="match-details">
              <p><strong>Data:</strong> ${matchDetails.date}</p>
              <p><strong>Hora:</strong> ${matchDetails.time}</p>
              <p><strong>Local:</strong> ${matchDetails.location}</p>
              <p><strong>Nível:</strong> ${matchDetails.level}</p>
            </div>
            <p style="text-align: center;">
              <a href="${inviteUrl}" class="button">Ver Convite</a>
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Padel App. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, `${inviterName} convidou-te para jogar Padel!`, html);
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[DEV MODE] Email would be sent to: ${to}`);
      this.logger.log(`[DEV MODE] Subject: ${subject}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }
}
