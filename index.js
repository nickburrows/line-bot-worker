import { Client, validateSignature } from '@line/bot-sdk'

// Worker 主程式
export default {
  async fetch(request, env) {
    try {
      console.log('Request received:', {
        method: request.method,
        url: request.url,
        headers: [...request.headers],
      })

      const CHANNEL_ACCESS_TOKEN = env.CHANNEL_ACCESS_TOKEN
      const CHANNEL_SECRET = env.CHANNEL_SECRET

      const bodyArrayBuffer = await request.arrayBuffer()
      const bodyText = new TextDecoder().decode(bodyArrayBuffer)
      const signature = request.headers.get('x-line-signature') || ''

      // 驗證簽章
      const isValid = validateSignature(bodyText, CHANNEL_SECRET, signature)
      if (!isValid) {
        console.error('Invalid signature:', signature)
        return new Response('Invalid signature', { status: 403 })
      }

      const body = JSON.parse(bodyText)
      const event = body.events?.[0]

      if (!event || event.type !== 'message' || !event.replyToken) {
        console.warn('No valid message or replyToken')
        return new Response('No valid message', { status: 200 })
      }

      const userMessage = event.message.text
      console.log(`User ID: ${event.source.userId}`)
      console.log(`User message: ${userMessage}`)

      const client = new Client({
        channelAccessToken: CHANNEL_ACCESS_TOKEN,
        channelSecret: CHANNEL_SECRET,
      })

      await client.replyMessage(event.replyToken, [
        { type: 'text', text: `你說的是：「${userMessage}」` },
      ])

      return new Response('OK', { status: 200 })
    } catch (error) {
      console.error('Error occurred:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  },
}