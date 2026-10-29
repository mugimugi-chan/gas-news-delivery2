// ==========================================
// 🚀 エントリーポイント（本番配信用・トリガーから実行）
// ==========================================
function sendDailyNews() {
  console.log("--- 本番配信処理を開始します ---");

  // ニュースサマリーを取得
  const { summary, dateStr } = generateNewsSummary();
  if (!summary) {
    console.error("【Error】ニュースの生成に失敗したため、送信を中止しました。");
    return;
  }

  // 要約本文と日付をそのままLINE送信関数へ渡す
  sendLineFlexNotification(summary, dateStr);

  console.log("--- すべての配信処理が完了しました ---");
}

// ==========================================
// 🧪 テスト実行用（APIを叩かずに即時テスト）
// ==========================================
function testSendDailyNews() {
  console.log("--- [TEST] LINE送信テストを開始します（ダミーデータ使用） ---");

  const dummyDateStr = "2026.10.29 THU";
  const dummySummary = 
    "■ 今日のニュース\n" +
    "日銀の金融政策決定会合が開催され、最新の発表が行われました。\n\n" +
    "■ ITニュース\n" +
    "主要テック企業が新しいマルチモーダルAIモデルをリリースしました。\n\n" +
    "■ 今日のZenn記事\n" +
    "スプレッドシートをノーコード管理画面にする解説記事が公開されました。";

  // テスト送信
  sendLineFlexNotification(dummySummary, dummyDateStr);

  console.log("--- [TEST] LINE送信テストが完了しました ---");
}