export default {
    async fetch(request, env, ctx) {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }
  
      const signature = request.headers.get('x-line-signature');
      const body = await request.text();
  
      const valid = await verifySignature(body, signature, env.LINE_CHANNEL_SECRET);
      if (!valid) {
        return new Response('Invalid signature', { status: 401 });
      }
  
      const json = JSON.parse(body);
      const events = json.events || [];
  
      for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
          await replyMessage(event.replyToken, `你說的是：「${event.message.text}」`, env.LINE_CHANNEL_ACCESS_TOKEN);
        }
      }
  
      return new Response('OK');
    }
  };
  
  async function verifySignature(body, signature, channelSecret) {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(channelSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
  
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
    return expected === signature;
  }
  
  async function replyMessage(replyToken, text, accessToken) {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text }]
      })
    });
  }