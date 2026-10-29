/**
 * スプレッドシートからトピック一覧を取得し、2ステップ（調査→要約）でニュース本文を生成する
 * @returns {Object} { summary: string, dateStr: string }
 */
function generateNewsSummary() {
  try {
    const sheetName = 'config';  // シートの名前を入力(スプレッドシートの名前ではない)
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`「${sheetName}」シートが見つかりません。`);
    }
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      throw new Error("スプレッドシートにデータが存在しません。");
    }

    const rows = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    let aggregatedResults = [];

    rows.forEach((row, index) => {
      const topic = row[0];       // A列: トピック名
      const instruction = row[1]; // B列: 指示内容
      const refUrl = row[2];      // C列: 参照URL

      if (!topic) return;

      console.log(`[${index + 1}/${rows.length}] 「${topic}」の処理を開始します...`);

      // ステップ1: 情報調査（リサーチフェーズ）
      const researchPrompt = `あなたは優秀なニュースリサーチャーです。
以下のトピックと参照条件に基づき、今日（最新）伝えるべき重要な一次情報・最新ニュース記事の内容（タイトル、要点、リンクなど）をWebから探して抽出してください。

【トピック】
${topic}

【参照先・検索条件】
${refUrl}

【出力指示】
余計な解説は不要です。収集した生のニュース情報・事実関係（ファクト）を箇条書きで漏れなく挙げてください。`;

      const rawResearchData = callGemini(researchPrompt);

      // ステップ2: 要約・整形（サマリーフェーズ）
      const summarizePrompt = `あなたは多忙なビジネスパーソン向けに朝刊を配信する編集者です。
ステップ1の【リサーチ情報】を使い、【編集指示】に従って「要点だけが30秒で読める」サマリーを作成してください。

【トピック】
${topic}

【リサーチ情報】
${rawResearchData}

【編集指示】
${instruction}

【厳格な制限ルール】
1. 前置き（「〜をお届けします」等）や終わりの挨拶・総括（「〜に役立ててください」等）は一切禁止。即座に「1. タイトル」から書き始めてください。
2. 各トピックの本文は【100文字程度（2〜3文）】でファクト（事実）のみを簡潔にまとめてください。
3. Zenn記事の場合は「タイトル」「URL」「学べること（2文以内）」をコンパクトに1つにまとめてください。
4. Markdown記号（###, **, --- 等）は使用禁止。見出しは「1. タイトル」の形式のみ使用してください。`;

      const finalTopicSummary = callGemini(summarizePrompt);

      aggregatedResults.push(`■ ${topic}\n${finalTopicSummary.trim()}`);
    });

    const summary = aggregatedResults.join("\n\n─────────────────\n\n");
    const now = new Date();
    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
    const yyyyMMdd = Utilities.formatDate(now, "JST", "yyyy.MM.dd");
    const dayOfWeek = weekDays[now.getDay()];
    const dateStr = `${yyyyMMdd} (${dayOfWeek})`;

    return { summary, dateStr };

  } catch (e) {
    console.error("ニュース生成エラー: " + e.toString());
    return { summary: null, dateStr: null };
  }
}

// ==========================================
// 🤖 Gemini APIを叩く共通関数（指数バックオフ・リトライ付き）
// ==========================================
function callGemini(promptText, maxRetries = 3) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const apiKey = scriptProperties.getProperty('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error('スクリプトプロパティに GEMINI_API_KEY が設定されていません！');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    "contents": [
      {
        "parts": [{"text": promptText}]
      }
    ]
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = UrlFetchApp.fetch(url, options);
      const json = JSON.parse(res.getContentText());

      // 成功した場合
      if (!json.error) {
        return json.candidates[0].content.parts[0].text;
      }

      // 503（混雑）または 429（レート制限）の場合はリトライ対象
      const statusCode = json.error.code;
      if (statusCode === 503 || statusCode === 429) {
        console.warn(`[Gemini API Warning] 一時的なエラー (${statusCode}): ${json.error.message} (試行 ${attempt}/${maxRetries})`);
        if (attempt < maxRetries) {
          Utilities.sleep(3000 * attempt); // 3秒、6秒...と待機時間を増やして再試行
          continue;
        }
      }

      // その他のエラー（キー間違い等）は即座に例外を投げる
      throw new Error(`Gemini APIからエラーが返されました: ${json.error.message}`);

    } catch (e) {
      // ネットワーク系の例外エラーの場合もリトライ
      if (attempt < maxRetries && e.message.indexOf("Gemini APIからエラー") === -1) {
        console.warn(`[通信エラー] ${e.toString()} (試行 ${attempt}/${maxRetries})`);
        Utilities.sleep(3000 * attempt);
        continue;
      }
      throw e;
    }
  }
}