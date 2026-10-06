import nodemailer from 'nodemailer';
import { IEmailProvider, SendEmailOptions, EmailSendResult } from './IEmailProvider';

export class NodemailerEmailProvider implements IEmailProvider {
  public readonly providerName = 'Nodemailer/SMTP';
  private transporter: nodemailer.Transporter | null = null;

  constructor(transporter?: nodemailer.Transporter | null) {
    if (transporter !== undefined) {
      this.transporter = transporter;
    } else {
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASSWORD;

      if (host && user && pass) {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
      }
    }
  }

  public isConfigured(): boolean {
    return !!this.transporter;
  }

  public async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    if (!this.transporter) {
      return {
        success: false,
        error: 'SMTP credentials not configured on server.',
      };
    }

    try {
      const attachments = options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/pdf',
      }));

      const info = await this.transporter.sendMail({
        from: options.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'SMTP delivery failed',
      };
    }
  }
}
