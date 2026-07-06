# 河口電機株式会社 コーポレートサイト

「まちの明かりを、絶やさない。」— 岐阜市の電気設備工事・空調設備工事、河口電機株式会社の公式サイトです。
素の HTML/CSS/JS のみで構成された静的サイトで、GitHub Pages でホスティングします（フレームワーク・ビルド不要）。

## 構成

```
index.html          トップ（インタラクティブヒーロー「波紋が灯していく」）
services.html       事業紹介（6事業）
works.html          施工実績（見本6件・追加しやすい構造）
recruit.html        採用情報
company.html        会社概要
contact.html        お問い合わせ（GASフォーム接続）
assets/
  css/common.css    全ページ共通スタイル（デザイントークン含む）
  css/subpage.css   下層ページ共通スタイル
  js/site.js        共通スクリプト（ローダー/ヘッダー/メニュー/フェードイン）
  js/hero.js        トップのCanvasヒーロー
  js/contact.js     フォーム送信（GAS_ENDPOINT はこのファイルで設定）
  img/og.png        OGP画像（1200×630・コード生成の夜景）
  img/favicon.svg   ファビコン
gas/Code.gs         Google Apps Script（メール通知＋スプレッドシート記録）
CNAME               独自ドメイン設定（kawaguchi-denki.com）
sitemap.xml / robots.txt
```

## 公開手順（GitHub Pages）

1. GitHub のリポジトリで **Settings → Pages** を開く
2. **Source: Deploy from a branch** / **Branch: main（または公開用ブランチ）/ (root)** を選んで Save
3. 数分待つと公開されます

> **⚠ 公開直後の確認について**
> リポジトリに `CNAME` ファイルがあるため、Pages の Custom domain に `kawaguchi-denki.com` が自動設定され、
> `kawaguchidenki001.github.io/corporate` へのアクセスは独自ドメインへリダイレクトされます。
> **DNS 切替前に github.io の URL で確認したい場合**は、Settings → Pages の「Custom domain」を一旦空にして Save してください
> （ドメイン切替のタイミングで `kawaguchi-denki.com` を再入力すれば元に戻ります）。

### 独自ドメイン切替（DNS）

ドメイン側（kawaguchi-denki.com の DNS）で以下を設定します。

| 種別 | ホスト | 値 |
|---|---|---|
| A | @ | 185.199.108.153 / 185.199.109.153 / 185.199.110.153 / 185.199.111.153（4件） |
| CNAME | www | kawaguchidenki001.github.io |

設定後、Settings → Pages の Custom domain に `kawaguchi-denki.com` を入力し、
「Enforce HTTPS」に必ずチェックを入れてください（証明書発行に最大24時間ほどかかることがあります）。

## フォームの本稼働（GAS接続）

フォームは Google Apps Script（GAS）に送信し、**メール通知＋スプレッドシート記録**を行います。

1. Google スプレッドシートを新規作成（例：「河口電機HP お問い合わせ」）
2. メニューの **拡張機能 → Apps Script** を開く
3. `gas/Code.gs` の内容をすべて貼り付けて保存
   - 通知先メールは冒頭の `NOTIFY_TO` で変更できます（初期値: kawaguchidenki001@gmail.com）
4. **デプロイ → 新しいデプロイ → 種類「ウェブアプリ」**
   - 次のユーザーとして実行：**自分**
   - アクセスできるユーザー：**全員**
5. 発行された「ウェブアプリURL」（`https://script.google.com/macros/s/…/exec`）をコピー
6. `assets/js/contact.js` の先頭にある `GAS_ENDPOINT = ''` に貼り付けてコミット

> エンドポイント未設定の間は、送信ボタンを押すと「フォームは現在準備中です。お電話ください」という案内が表示されます（サイト自体は問題なく公開できます）。
>
> スパム対策として、人間には見えないハニーポット欄（`website`）が空であることを GAS 側でも確認しています。

## 画像の差し替え

現在の写真枠はすべてプレースホルダー（`.ph` 要素）です。実写・AI画像が用意でき次第、
`.ph` の `<div>` を `<img>` に置き換えてください。

```html
<!-- 差し替え前 -->
<div class="ph"><div class="grain"></div><span class="glyph">…写真</span></div>

<!-- 差し替え後 -->
<img src="assets/img/works-led.jpg" alt="県営住宅のLED化改修工事の様子" loading="lazy"
     style="width:100%;height:100%;object-fit:cover;display:block">
```

- `alt` には写真の内容を必ず書いてください（アクセシビリティ・SEO）
- `loading="lazy"` を付けてください（表示速度）
- **代表者・スタッフ・施工実績の写真は実写のみ**（実在を主張する画像のためAI生成は不可）

## 施工実績（works.html）の追加

`.wp-card` のブロックをコピーして増やすだけで追加できます。カテゴリ名・案件名・メタ情報を書き換えてください。

## メンテナンスの注意

- デザイントークン（色・フォント・余白）は `assets/css/common.css` の `:root` にまとまっています
- ヒーローの挙動（波紋→窓が灯る→カウンター）は `assets/js/hero.js`。`prefers-reduced-motion` 時は全点灯の静止画になります
- ページを追加したら `sitemap.xml` にもURLを追記してください
