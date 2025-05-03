// Worker 主程式
export default {
    async fetch(request) {
      const CHANNEL_ACCESS_TOKEN = env.CHANNEL_ACCESS_TOKEN
      const CHANNEL_SECRET = env.CHANNEL_SECRET
  
      const signature = request.headers.get('x-line-signature') || ''
      const bodyArrayBuffer = await request.arrayBuffer()
      const isValid = await verifySignature(CHANNEL_SECRET, bodyArrayBuffer, signature)
  
      if (!isValid) {
        return new Response('Invalid signature', { status: 403 })
      }
  
      const bodyText = new TextDecoder().decode(bodyArrayBuffer)
      const body = JSON.parse(bodyText)
  
      const event = body.events?.[0]
      if (event?.type !== 'message' || !event.replyToken) {
        return new Response('No valid message', { status: 200 })
      }
  
      const userMessage = event.message.text
  
      const replyPayload = {
        replyToken: event.replyToken,
        messages: [
          {
            type: 'text',
            text: `你說的是：「${userMessage}」`,
          },
        ],
      }
  
      await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(replyPayload),
      })
  
      return new Response('OK', { status: 200 })
    },
  }
  
  // 簽章驗證函數
  async function verifySignature(secret, bodyBuffer, signature) {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, bodyBuffer)
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    return signature === signatureBase64
  }