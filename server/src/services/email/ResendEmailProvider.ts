import { Resend } from 'resend';
import { IEmailProvider, SendEmailOptions, EmailSendResult } from './IEmailProvider';

export class ResendEmailProvider implements IEmailProvider {
  public readonly providerName = 'Resend';
  private resend: Resend | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.RESEND_API_KEY;
    if (key && key.trim()) {
      this.resend = new Resend(key.trim());
    }
  }

  public isConfigured(): boolean {
    return !!this.resend;
  }

  public async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    if (!this.resend) {
      return {
        success: false,
        error: 'Resend API key not configured on server (RESEND_API_KEY missing).',
      };
    }

    try {
      const to = Array.isArray(options.to) ? options.to : [options.to];
      const attachments = options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
      }));

      const response = await this.resend.emails.send({
        from: options.from,
        to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments,
      });

      if (response.error) {
        const errName = response.error.name || 'ResendError';
        const errMsg = response.error.message || 'Unknown provider error';
        return {
          success: false,
          error: `[${errName}] ${errMsg}`,
        };
      }

      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Resend HTTPS API request failed.',
      };
    }
  }
}
