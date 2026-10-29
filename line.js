// 🎨 LINEカードデザインのカラー設定
const LINE_THEME = {
  HEADER_BG: "#0284C7",   // 清々しいスカイブルー（ヘッダー背景）
  HEADER_TEXT: "#FFFFFF", // ヘッダー文字色（白）
  TITLE_TEXT: "#0369A1",  // 見出し文字色（深みのあるブルー）
  BODY_TEXT: "#334155"    // 本文文字色（ダークスレート）
};

/**
 * 要約テキストと日付を受け取り、Flex Messageを構築してLINE友だち全員に一括配信する
 * @param {string} summary - 配信するニュース本文
 * @param {string} dateStr - ヘッダーに表示する日付文字列（例: "2026.10.29 THU"）
 */
function sendLineFlexNotification(summary, dateStr) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!token) {
    Logger.log('【LINE Error】LINE_CHANNEL_ACCESS_TOKEN が設定されていません。');
    return;
  }

  // 1. メッセージテキストから Flex Message JSON を構築
  const flexPayload = buildFlexMessage_(summary, dateStr);

  // 2. LINE Messaging API (Broadcast) へリクエスト
  const url = 'https://api.line.me/v2/bot/message/broadcast';
  
  const payload = {
    messages: [
      {
        type: 'flex',
        altText: '🗞️ 本日の朝刊ニュースが届きました',
        contents: flexPayload
      }
    ]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    if (code === 200) {
      Logger.log('【LINE Flex】全員への一括配信（ブロードキャスト）成功！');
    } else {
      Logger.log('【LINE Flex Error】ステータスコード: ' + code + ' レスポンス: ' + response.getContentText());
    }
  } catch (e) {
    Logger.log('【LINE Exception】' + e.toString());
  }
}

/**
 * 🛠️ Flex Message の JSON 構造体を組み立てる内部関数
 * @param {string} summary 
 * @param {string} dateStr 
 * @returns {Object} Flex Message Bubble オブジェクト
 */
function buildFlexMessage_(summary, dateStr) {
  // 1. Markdown記号のサニタイズ（徹底掃除）
  let cleanSummary = summary
    .replace(/^#{1,6}\s*/gm, '')  // 行頭の ### や ## を削除
    .replace(/^[-*_]{3,}\s*$/gm, '') // --- や *** などの区切り線を削除
    .replace(/\*\*(.*?)\*\*/g, '$1') // **太字** を通常の文字列に変換
    .replace(/\*(.*?)\*/g, '$1')     // *斜体* を通常の文字列に変換
    .replace(/`(.*?)`/g, '$1');      // `コード` 記号を削除

  // 2. 行ごとに分解して空行を整理
  const lines = cleanSummary.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const bodyContents = [];

  lines.forEach(line => {
    // 見出しの判定（■ トピック名 や 1. 数字始まり）
    if (/^(■|\d+\.)/.test(line)) {
      bodyContents.push({
        type: "text",
        text: line,
        weight: "bold",
        size: "md",
        color: LINE_THEME.TITLE_TEXT,
        wrap: true,
        margin: "md"
      });
    } else {
      // 本文
      bodyContents.push({
        type: "text",
        text: line,
        size: "sm",
        color: LINE_THEME.BODY_TEXT,
        wrap: true,
        margin: "xs"
      });
    }
  });

  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: LINE_THEME.HEADER_BG,
      contents: [
        {
          type: "text",
          text: "🗞️ 朝刊のむぎちゃん",
          weight: "bold",
          color: LINE_THEME.HEADER_TEXT,
          size: "lg"
        },
        {
          type: "text",
          text: dateStr,
          color: LINE_THEME.HEADER_TEXT,
          size: "xs",
          margin: "xs"
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: bodyContents
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "separator",
          color: "#EEEEEE"
        },
        {
          type: "text",
          text: "今日も素晴らしい一日をお過ごしください！☀️",
          size: "xs",
          color: "#AAAAAA",
          align: "center",
          margin: "md"
        }
      ]
    }
  };
}