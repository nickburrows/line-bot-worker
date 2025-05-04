// Worker 主程式
export default {
  async fetch(request, env) {
    try {
      console.log('Request received:', {
        method: request.method,
        url: request.url,
        headers: [...request.headers],
      })

      // 從環境變數中獲取 LINE 的 Channel Access Token 和 Channel Secret
      const CHANNEL_ACCESS_TOKEN = env.CHANNEL_ACCESS_TOKEN
      const CHANNEL_SECRET = env.CHANNEL_SECRET

      // 獲取簽章並驗證
      const signature = request.headers.get('x-line-signature') || ''
      const bodyArrayBuffer = await request.arrayBuffer()
      const isValid = await verifySignature(CHANNEL_SECRET, bodyArrayBuffer, signature)

      if (!isValid) {
        console.error('Invalid signature:', signature)
        return new Response('Invalid signature', { status: 403 })
      }

      console.log('Signature verified successfully')

      // 解析請求的 JSON 主體
      const bodyText = new TextDecoder().decode(bodyArrayBuffer)
      console.log('Request body:', bodyText)
      const body = JSON.parse(bodyText)

      // 確保事件有效
      const event = body.events?.[0]
      if (!event) {
        console.warn('No events found in request body')
        return new Response('No valid message', { status: 200 })
      }

      console.log('Event received:', event)

      if (event.type !== 'message' || !event.replyToken) {
        console.warn('Event is not a valid message or missing replyToken')
        return new Response('No valid message', { status: 200 })
      }

      // 處理用戶訊息
      const userMessage = event.message.text
      console.log(`Destination User ID: ${event.source.userId}`)
      console.log(`User message: ${userMessage}`)

      // 準備回覆訊息
      const replyPayload = {
        replyToken: event.replyToken,
        messages: [
          {
            type: 'text',
            text: `你說的是：「${userMessage}」`,
          },
        ],
      }

      console.log('Reply payload:', replyPayload)

      // 發送回覆請求到 LINE Messaging API
      const response = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(replyPayload),
      })

      console.log('Reply API response status:', response.status)
      if (!response.ok) {
        console.error('Reply API error:', await response.text())
        return new Response('Failed to send reply', { status: 500 })
      }

      console.log(`Echo message to ${event.replyToken}: ${userMessage}`)

      // 返回成功響應
      return new Response('OK', { status: 200 })
    } catch (error) {
      console.error('Error occurred:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
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