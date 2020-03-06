サンプルコード
====

Overview

## Description
とある学校等で広告を実施した。その運用にかかる月ごとのレポートの作成  
という想定のサンプルコード

動作

1. エクセルファイルを読み取る
1. Athena のデータを読み取る
1. Redshift のデータを読み取る
1. 上記をまとめて集計
1. エクセルファイルに書きだす

サンプルのため、実際にデプロイ⇒実行は不可能

以下の技術を利用する
- TypeScript
- Serverless-framework
- Node.js
- ES Lint
- AWS Lambda
- AWS Athena
- AWS Redshift
- AWS S3

## Deploy
```shell
$ yarn install
$ npx sls deploy --stage dev
```
実際には上記も正常には動作しない状態になっているので注意

## Usage
サンプルのため実行は不可能

## Licence
一切の利用は不可

