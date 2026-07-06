/* お問い合わせフォーム送信スクリプト（Google Apps Script 接続）
 *
 * 【設定方法】
 * 1. gas/Code.gs をスプレッドシートの Apps Script にデプロイ（手順は README.md 参照）
 * 2. 発行された「ウェブアプリURL」を下の GAS_ENDPOINT に貼り付ける
 *    例: var GAS_ENDPOINT = 'https://script.google.com/macros/s/XXXXX/exec';
 */
(function () {
  var GAS_ENDPOINT = ''; // ★ ここに GAS のウェブアプリURLを貼り付けてください

  var form = document.getElementById('contact-form');
  if (!form) return;
  var btn = document.getElementById('submit-btn');
  var err = document.getElementById('form-error');
  var thanks = document.getElementById('form-thanks');

  function showError(msg) { err.textContent = msg; err.hidden = false; }
  function showThanks() {
    // .form の display:grid が [hidden] より優先されるため display も直接消す
    form.hidden = true;
    form.style.display = 'none';
    err.hidden = true;
    thanks.hidden = false;
    thanks.focus();
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    err.hidden = true;
    if (!form.reportValidity()) return;

    // ハニーポット: 人間には見えない欄が埋まっていたら bot とみなし、送信せず成功表示だけ返す
    if (form.elements.website && form.elements.website.value) { showThanks(); return; }

    if (!GAS_ENDPOINT) {
      showError('フォームは現在準備中です。お手数ですが、お電話（058-275-4141）またはFAX（058-275-4133）にてお問い合わせください。');
      return;
    }

    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = '送信中…';

    var body = new URLSearchParams();
    new FormData(form).forEach(function (v, k) { body.append(k, v); });
    body.append('page', location.href);

    fetch(GAS_ENDPOINT, { method: 'POST', body: body })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        // GAS は必ず JSON を返す設計。JSON でない応答（誤設定・GAS側異常）は失敗として扱う
        return res.json();
      })
      .then(function (data) {
        if (data && data.ok === false) throw new Error(data.error || 'server error');
        showThanks();
      })
      .catch(function () {
        showError('送信できませんでした。お手数ですが、時間をおいて再度お試しいただくか、お電話（058-275-4141）にてお問い合わせください。');
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = label;
      });
  });
})();
