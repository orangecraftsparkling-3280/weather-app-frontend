# お天気アプリ（フロントエンド）

![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwindcss&logoColor=white)

ユーザーの現在地や保存したお気に入り地域の天気を手軽に確認できる、お天気アプリケーションのフロントエンド画面です。
バックエンドのLaravel APIと連携し、外部の気象APIからデータを取得してリアルタイムに描画します。

## スクリーンショット

|                天気表示画面                |              お気に入り選択画面              |
| :----------------------------------------: | :------------------------------------------: |
| ![天気表示](docs/images/お天気アプリ1.png) | ![お気に入り](docs/images/お天気アプリ2.png) |

## 機能一覧

- 現在位置のGPS取得（ブラウザ Geolocation API 連携）
- 逆ジオコーディングによる地名特定（国土地理院 API 連携）
- リアルタイム天気情報の表示（Open-Meteo API 連携）
- お気に入り・履歴地域のセレクトボックス表示
- 重複登録防止の通信スキップ制御機能
- Tailwind CSSによるレスポンシブデザイン

## 環境構築

```bash
git clone https://github.com/orangecraftsparkling-3280/weather-app-frontend.git
cd weather-app-frontend
docker compose up -d
```

## 実行環境

- フロントエンド環境
  - Node.js 24.15.0
  - npm 11.12.1
  - Tailwind CSS (Standalone CLI)
  - Vanilla JS (ES6+)

## ホストOS

- macOS / Windows / Linux（ブラウザ環境が動作する環境）

## 推奨ブラウザ

- Chrome / Firefox / Edge（最新バージョン）
- ※位置情報取得（Geolocation API）の許可が必要です。

## 接続先一覧

- Webサイト: hhttp://localhost:8080

## 作成者

- 作成者: [kazuyuki asari]
- GitHub: https://github.com/orangecraftsparkling-3280
