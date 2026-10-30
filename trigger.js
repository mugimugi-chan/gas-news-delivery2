// ⏰ キャッシュ作成および配信目標時刻
// ※ キャッシュ生成の「分」はGASの仕様上 0, 15, 30, 45 のいずれかを推奨
const TARGET_CACHE_TIME = "06:30:00";
const TARGET_DELIVERY_TIME = "08:00:00";

/**
 * 毎朝6:30のニュース生成・キャッシュと、8:00ジャスト配信タイマーを生成する親トリガー設定
 * （この関数自体を毎朝1:00〜2:00等の日次トリガーにセットしておきます）
 */
function makeTriggers() {
  deleteAllTriggers();

  // 1. 毎朝 TARGET_CACHE_TIME にニュースを生成して cache シートへ保存
  //    ※ TARGET_DELIVERY_TIME より前にキャッシュを作成しておくこと
  ScriptApp.newTrigger('fetchAndCacheNewsSummary')
    .timeBased()
    .everyDays(1)
    .atHour(Number(TARGET_CACHE_TIME.split(':')[0]))
    .nearMinute(Number(TARGET_CACHE_TIME.split(':')[1]))
    .create();

  // 2. TARGET_DELIVERY_TIME に指定した時刻ジャストに発動するピンポイントタイマーを作成
  const [hours, minutes, seconds] = TARGET_DELIVERY_TIME.split(':').map(Number);
  
  const today = new Date();
  const targetTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    hours,   // TARGET_DELIVERY_TIME の時
    minutes, // TARGET_DELIVERY_TIME の分
    seconds  // TARGET_DELIVERY_TIME の秒
  );
  ScriptApp.newTrigger('sendNewsToLine')
    .timeBased()
    .at(targetTime)
    .create();

  console.log("毎朝 6:30 生成 ➔ 8:00:00 配信のパイプラインを設定しました！");
}

/**
 * プロジェクト内の実行済みの古いトリガーをすべて削除する内部関数
 */
function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    // 自分自身（makeTriggers）以外のワンショットトリガー等を削除
    if (trigger.getHandlerFunction() === 'fetchAndCacheNewsSummary' || trigger.getHandlerFunction() === 'sendNewsToLine') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  console.log("既存の配信トリガーを整理しました。");
}