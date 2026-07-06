/**
 * 河口電機株式会社 コーポレートサイト お問い合わせフォーム受信スクリプト
 * （メール通知 ＋ スプレッドシート記録）
 *
 * 【デプロイ手順】※詳細は README.md の「フォームの本稼働（GAS接続）」参照
 * 1. Google スプレッドシートを新規作成（例:「河口電機HP お問い合わせ」）
 * 2. 拡張機能 → Apps Script を開き、このファイルの内容をすべて貼り付けて保存
 * 3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *      - 次のユーザーとして実行: 自分
 *      - アクセスできるユーザー: 全員
 * 4. 発行された「ウェブアプリURL」を assets/js/contact.js の GAS_ENDPOINT に貼り付ける
 *    ※初回デプロイ時に権限の承認画面が出たら許可してください
 */

// 通知先メールアドレス（複数はカンマ区切り: 'a@example.com,b@example.com'）
var NOTIFY_TO = 'kawaguchidenki001@gmail.com';

// 記録先のシート名（無ければ自動作成されます）
var SHEET_NAME = 'お問い合わせ';

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    // ハニーポット: bot が埋める隠し欄。埋まっていたら何もせず成功を装う
    if (p.website) return json_({ ok: true });

    // 必須項目チェック
    if (!p.name || !p.email || !p.message) {
      return json_({ ok: false, error: 'required fields missing' });
    }

    // --- スプレッドシートに記録 ---
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['受信日時', '会社名・団体名', 'お名前', 'メールアドレス', '電話番号', '種別', '内容', '送信元ページ']);
    }
    sheet.appendRow([
      new Date(),
      p.company || '',
      p.name,
      p.email,
      p.tel || '',
      p.type || '',
      p.message,
      p.page || ''
    ]);

    // --- メール通知 ---
    MailApp.sendEmail({
      to: NOTIFY_TO,
      replyTo: p.email,
      subject: '【HPお問い合わせ】' + (p.type ? p.type + '：' : '') + p.name + ' 様',
      body: [
        'ホームページのお問い合わせフォームから送信がありました。',
        '',
        '■ 会社名・団体名： ' + (p.company || '（未記入）'),
        '■ お名前　　　　： ' + p.name,
        '■ メール　　　　： ' + p.email,
        '■ 電話番号　　　： ' + (p.tel || '（未記入）'),
        '■ 種別　　　　　： ' + (p.type || '（未選択）'),
        '',
        '■ お問い合わせ内容：',
        p.message,
        '',
        '----',
        'このメールに返信すると、お客様（' + p.email + '）宛に返信されます。',
        '記録: スプレッドシート「' + SHEET_NAME + '」'
      ].join('\n')
    });

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
