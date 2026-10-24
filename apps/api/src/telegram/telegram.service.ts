import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  get botToken(): string | undefined {
    return process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
  }

  get adminChatId(): string | undefined {
    return process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  }

  /**
   * Send arbitrary HTML message to configured admin Telegram chat
   */
  async sendAdminNotification(message: string): Promise<{ success: boolean; result?: any; error?: string }> {
    const token = this.botToken;
    const chatId = this.adminChatId;

    if (!token || !chatId) {
      this.logger.warn(
        `Telegram notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not configured in environment.`
      );
      return { success: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not configured' };
    }

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok || !data.ok) {
        this.logger.error(`Telegram API error: ${JSON.stringify(data)}`);
        return { success: false, error: data.description || 'Telegram API returned an error' };
      }

      this.logger.log(`Telegram notification sent successfully to chat ${chatId}`);
      return { success: true, result: data };
    } catch (err: any) {
      this.logger.error(`Failed to send Telegram message: ${err?.message || err}`);
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Send structured alert when a new physical NFC card order is registered or verified
   */
  async sendNewOrderNotification(order: {
    id: string;
    tier: string;
    quantity: number;
    totalAmount: number;
    currency: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    companyName?: string | null;
    shippingAddress?: any;
    paymentMethod?: string | null;
    paymentReference?: string | null;
    isPaid?: boolean;
  }) {
    const ref = `KL-${order.id.slice(0, 8).toUpperCase()}`;
    const statusText = order.isPaid
      ? '✅ <b>PAID &amp; IN PRINT QUEUE</b>'
      : '⏳ <b>PENDING PAYMENT REVIEW</b>';

    const text = [
      `🖨️ <b>NEW KOOLINK CARD ORDER!</b>`,
      ``,
      `<b>Order Ref:</b> <code>${ref}</code>`,
      `<b>Status:</b> ${statusText}`,
      `<b>Cards:</b> ${order.quantity} card(s) · <i>${order.tier}</i>`,
      `<b>Amount:</b> <b>${order.totalAmount.toLocaleString()} ${order.currency}</b>`,
      ``,
      `👤 <b>Customer:</b> ${order.customerName}`,
      order.companyName ? `🏢 <b>Company:</b> ${order.companyName}` : '',
      order.customerPhone ? `📞 <b>Phone:</b> <code>${order.customerPhone}</code>` : '',
      order.customerEmail ? `✉️ <b>Email:</b> ${order.customerEmail}` : '',
      ``,
      order.shippingAddress
        ? `📍 <b>Delivery:</b> ${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}`
        : '',
      order.paymentMethod ? `💳 <b>Method:</b> ${order.paymentMethod.toUpperCase()}` : '',
      order.paymentReference ? `🧾 <b>Ref ID:</b> <code>${order.paymentReference}</code>` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return this.sendAdminNotification(text);
  }
}
