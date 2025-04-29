import { Client, middleware } from '@line/bot-sdk';

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/webhook' && request.method === 'POST') {
      const body = await request.json();
      const signature = request.headers.get('x-line-signature');

      if (!middleware(config)(body, signature)) {
        return new Response('Unauthorized', { status: 401 });
      }

      const events = body.events;
      for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: `You said: ${event.message.text}`,
          });
        }
      }

      return new Response('OK', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  },
};
