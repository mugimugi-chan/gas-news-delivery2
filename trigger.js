/**
 * 毎日深夜に自動実行され、当日の「朝8:00ジャスト」に実行される特定日時トリガーを作成する関数
 * （この関数自体を毎朝1:00〜2:00等の日次トリガーにセットしておきます）
 */
function setDaily8AMTrigger() {
  // 過去の使い終わりトリガーが残らないよう一度お掃除
  deleteAllTriggers_();

  // 当日（または翌日）の8:00:00のDateオブジェクトを作成
  const today = new Date();
  const targetTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    8,  // 8時
    0,  // 0分
    0   // 0秒
  );

  // もし深夜に実行した時点で既に8時を過ぎている場合は翌日の8時にセット
  if (today.getTime() > targetTime.getTime()) {
    targetTime.setDate(targetTime.getDate() + 1);
  }

  // 8:00:00 ピンポイント指定でワンショットトリガーを作成
  ScriptApp.newTrigger('sendDailyNewsToAll')
    .timeBased()
    .at(targetTime)
    .create();

  console.log(`[Trigger Created] 次回のニュース配信を ${targetTime.toLocaleString()} にセットしました。`);
}

/**
 * プロジェクト内の古いトリガーをすべて削除する内部関数
 */
function deleteAllTriggers_() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    // 自分自身（setDaily8AMTrigger）以外のワンショットトリガー等を削除
    if (trigger.getHandlerFunction() === 'sendDailyNewsToAll') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  console.log("既存の配信トリガーを整理しました。");
}