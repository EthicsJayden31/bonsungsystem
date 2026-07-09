# 蹂몄꽦 ?ㅽ뀒?댁? ?댁쁺 諛고룷 泥댄겕由ъ뒪??
## 1. ?꾩닔 ?섍꼍 蹂??
```text
NODE_ENV=production
NEXT_PUBLIC_BONSUNG_API_BASE_URL=/api/stage
BONSUNG_SERVER_HOST=0.0.0.0
BONSUNG_ALLOWED_ORIGINS=https://ethicsjayden31.github.io
BONSUNG_LOCAL_SERVER_PASSWORD=<manager-coach-artist-seed-password>
BONSUNG_ADMIN_INITIAL_PASSWORD=<admin-initial-password>
BONSUNG_SESSION_TTL_HOURS=12
```

Google Sheets ??μ냼瑜?????

```text
BONSUNG_STORAGE_DRIVER=google-sheets
BONSUNG_GOOGLE_SHEETS_SPREADSHEET_ID=<spreadsheet-id>
BONSUNG_GOOGLE_SERVICE_ACCOUNT_JSON=<service-account-json>
BONSUNG_SESSION_SECRET=<long-random-secret>
```

## 2. 寃利?
```bash
pnpm run verify:stage-production-env
pnpm run verify:stage-server
pnpm run verify:stage-vercel-api
pnpm run verify:stage-cleanup
```

?몃? ?쒕쾭瑜??곌껐????

```bash
BONSUNG_API_BASE_URL=https://your-stage-server.example pnpm run verify:stage-release
BONSUNG_SERVER_VERIFY_BASE_URL=https://your-stage-server.example pnpm run verify:stage-server
```

## 3. 泥??댁쁺 ?덉감

1. 蹂몄꽦 ?ㅽ뀒?댁? API瑜?諛고룷?⑸땲??
2. `/health`媛 ?뺤긽?몄? ?뺤씤?⑸땲??
3. Google Sheets ?먮뒗 Apps Script ??μ냼 ?곌껐???뺤씤?⑸땲??
4. Admin?쇰줈 濡쒓렇?명빀?덈떎.
5. Manager, Coach, Artist 怨꾩젙???ㅼ젣 ?댁쁺 湲곗???留욊쾶 ?뺣━?⑸땲??
6. ?곷떞, ?섏뾽, 異쒓껐, ?섎궔, 怨듭?, ?곗씠???대낫?닿린, 媛먯궗 濡쒓렇瑜??뺤씤?⑸땲??

## 4. 諛고룷 遺덇? 議곌굔

- ?댁쁺 UI媛 localhost API瑜?諛붾씪遊?- ?댁쁺 ??μ냼媛 `memory` 紐⑤뱶??- 湲곕낯 鍮꾨?踰덊샇媛 ?댁쁺 ?섍꼍???⑥븘 ?덉쓬
