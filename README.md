# 地動説テトリス

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

## デプロイ

`main` ブランチへ push すると GitHub Actions (`Deploy to GitHub Pages`) が自動でビルドし、`gh-pages` ブランチ経由で GitHub Pages に公開されます。ローカルでデプロイ内容を確認したい場合は `npm run build` を実行し、`dist` ディレクトリの中身を確認してください。
