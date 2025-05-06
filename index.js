import * as line from '@line/bot-sdk';
import { Translate } from '@google-cloud/translate';

// 初始化 Google Cloud Translation 客戶端，使用 API 金鑰
export default {
  async fetch(request, env) {
    try {
      // 初始化 Google Cloud Translation 客戶端
      const translateClient = new Translate({ key: env.GOOGLE_API_KEY });

      // 初始化 LINE 客戶端
      const lineConfig = {
        channelAccessToken: env.CHANNEL_ACCESS_TOKEN,
        channelSecret: env.CHANNEL_SECRET,
      };
      const lineClient = new line.Client(lineConfig);

      // 獲取簽章並驗證
      const signature = request.headers.get('x-line-signature') || '';
      const body = await request.text();

      if (!line.validateSignature(body, lineConfig.channelSecret, signature)) {
        console.error('Invalid signature:', signature);
        return new Response('Invalid signature', { status: 403 });
      }

      console.log('Signature verified successfully');

      // 解析請求的 JSON 主體
      const bodyJson = JSON.parse(body);
      const event = bodyJson.events?.[0];

      if (!event || event.type !== 'message' || !event.replyToken) {
        console.warn('No valid message or missing replyToken');
        return new Response('No valid message', { status: 200 });
      }

      const userMessage = event.message.text;
      console.log(`User message: ${userMessage}`);

      // 翻譯訊息
      const translationResult = await translateSmart(userMessage, translateClient);

      // 回覆訊息
      const replyMessage = {
        type: 'text',
        text: translationResult.translated,
      };

      await lineClient.replyMessage(event.replyToken, replyMessage);
      console.log('Reply sent successfully');

      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('Error occurred:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

// 翻譯功能
async function translateSmart(text, translateClient) {
  try {
    // 檢測語言
    const [detection] = await translateClient.detect(text);
    const detectedLang = detection.language || 'unknown';
    console.log(`Detected language: ${detectedLang}`);

    // 決定目標語言
    const targetLang = detectedLang.startsWith('zh') ? 'en' : 'zh-TW';

    // 翻譯文字
    const [translation] = await translateClient.translate(text, targetLang);
    console.log(`Translated text: ${translation}`);

    return {
      translated: translation,
      targetLang,
    };
  } catch (error) {
    console.error('Error in translateSmart:', error);
    throw error;
  }
}