# 004. apps/web Ideal Shape

## 1. Summary

`apps/web` の理想形は、単なるデモ用ページ群ではなく、Flovia の中核体験を 1 本の流れとして見せるプロダクト UI である。

SPEC が見せたい体験は次の流れ。

```txt
Privy login
  -> embedded wallet / linked accounts を確認
  -> agent を予算・カテゴリ付きで authorize
  -> agent が merchant API を呼ぶ
  -> HTTP 402 と flovia offer を見る
  -> wallet-only なら full price + unlock prompt
  -> email / Farcaster link 後に discount price へ変わる
  -> agent が pay / simulate payment
  -> dashboard に request / offer / conversion / revenue が反映される
```

現在の `apps/web` はルートや部品は揃っているが、体験が分断されている。理想形では、ログイン、認可、予算、402、価格変化、支払い、dashboard 更新が一続きに見える必要がある。

## 2. Core Product Story

Flovia の Web UI が伝えるべき物語はこれ。

```txt
wallet-only Privy user
  -> agent calls merchant API
  -> merchant returns HTTP 402
  -> flovia offer says final_price = 0.05
  -> unlock says link_email_or_farcaster to reach 0.025

email / Farcaster linked Privy user
  -> agent retries merchant API
  -> merchant returns HTTP 402
  -> flovia offer says final_price = 0.025
  -> agent pays or simulates payment
  -> dashboard records conversion and revenue
```

この価格差が Flovia のデモの中心である。UI はこの before / after を明確に見せるべき。

## 3. Ideal Route Responsibilities

### 3.1 `/`

Landing 兼 demo entry。

理想:

```txt
- Flovia が何をするかを一言で説明する
- Demo Flow への入口を置く
- 現在の demo state を軽く表示する
- login / authorize / run agent / dashboard へ迷わず進める
```

避けたい状態:

```txt
- metrics と説明だけがあり、次に何をすればいいか分からない
- dashboard 風の情報が landing に散らばる
```

### 3.2 `/login`

Privy identity setup。

理想:

```txt
- Privy login 状態を表示する
- embedded wallet address を表示する
- linked account flags を表示する
- email / Farcaster / GitHub / passkey link を実行できる
- Flovia backend へ normalized identity を sync できる
- merchant に raw PII を渡さないことを明示する
```

重要:

```txt
email や Farcaster の実値を merchant に見せない。
UI でも merchant-visible data と Flovia-internal data を分けて見せるとよい。
```

### 3.3 `/authorize`

Agent authorization と policy setup。

理想:

```txt
- wallet を手入力させるだけではなく、logged-in user の wallet を使う
- agent に許可する budget を設定する
- category を設定する: market_signal など
- merchant scope を設定する: merch_demo など
- expiration を設定する
- authorized / revoked の状態を表示する
```

最低限あるべき UI:

```txt
Allow this agent to spend:
  budget: 0.25 USDC
  category: market_signal
  merchant: merch_demo
  expires: 1 hour

[Authorize agent]
```

現在のような `wallet + authorized boolean` だけの UI は、debug seed にはよいが、SPEC の agent authorization UI としては弱い。

### 3.4 `/agent`

Demo agent control panel。

理想:

```txt
- 画面から merchant API call を開始できる
- request target を表示する: GET /api/premium-signal
- budget を表示する
- agent authorization 状態を表示する
- returned HTTP 402 を表示する
- accepts[0] と flovia extension を見せる
- agent の判断を表示する
- pay / simulate payment を実行できる
- paid response と flovia_next_offer を表示する
```

理想の表示例:

```txt
Current user:
  wallet: 0xabc...
  linked accounts: wallet only
  agent authorized: yes
  budget: 0.25 USDC

Merchant request:
  GET /api/premium-signal

402 response:
  base_price: 0.05
  final_price: 0.05
  policy: base_price_until_verified
  reason_codes: [low_identity_confidence]

Suggested action:
  Link email or Farcaster to unlock 0.025 USDC
```

verified 後の表示例:

```txt
402 response:
  base_price: 0.05
  final_price: 0.025
  policy: verified_user_discount
  reason_codes: [verified_privy_user]

Agent decision:
  Offer is within budget. Simulate payment.
```

避けたい状態:

```txt
- CLI コマンドだけを表示する
- 402 response が UI に出ない
- offer decision が見えない
```

### 3.5 `/dashboard`

Merchant dashboard。

理想:

```txt
- summary cards を表示する
- recent requests を表示する
- segment performance を表示する
- offer performance を表示する
- reason codes を表示する
- demo flow で発生した request / payment が反映されたことが分かる
```

SPEC 上の summary cards:

```txt
- Requests
- 402 offers returned
- Paid conversions
- Revenue USDC
- Revenue lift vs fixed price
- Discount conversions
- Optional: Bundle conversions
- Optional: Premium upsells
```

recent requests は最低限これを持つべき:

```txt
- Time
- Wallet
- Segment
- Endpoint
- Base price
- Final price
- Policy
- Status
- Tx hash
```

dashboard は単なる API JSON viewer ではなく、Flovia の価値である conversion / revenue lift / segment pricing を見せる場所にする。

## 4. Ideal One-Screen Demo Flow

最も重要なのは、`/agent` または `/` に 1 本の demo flow を作ること。

```txt
Step 1: Login with Privy
Step 2: Sync identity to Flovia
Step 3: Authorize agent with 0.25 USDC budget
Step 4: Run merchant request
Step 5: Inspect 402 offer
Step 6: Link email / Farcaster if unlockable
Step 7: Retry quote
Step 8: Simulate payment
Step 9: View dashboard update
```

この画面があると、各ルートが多少未完成でも、SPEC のデモ価値が伝わる。

## 5. Visual Priorities

UI で強調すべきもの:

```txt
- before price: 0.05 USDC
- after price: 0.025 USDC
- why changed: verified_privy_user / strong_auth_privy_user
- privacy: merchant sees only normalized signals
- agent policy: budget, category, merchant, expiration
- result: paid conversion and dashboard revenue
```

UI で目立たせすぎないもの:

```txt
- raw API JSON
- local dev commands
- debug-only wallet seed forms
- optional bundle / upsell fields before Pattern 1 is working
```

## 6. MVP Cut Line

優先順位は以下。

```txt
P0:
  - Login state
  - Wallet display
  - Linked account flags
  - Agent authorization with budget/category
  - Merchant request button
  - 402 offer display
  - wallet-only vs verified price difference
  - simulate payment
  - dashboard update

P1:
  - Offer performance table
  - reason_codes visualization
  - tx hash display in simulation/real mode
  - better merchant-visible vs Flovia-internal privacy panel

P2:
  - bundle offers
  - flovia_next_offer upsells
  - multi-merchant controls
  - richer charts
```

## 7. Practical Next Step

次に手を入れるなら、`/agent` を CLI 説明ページから demo control panel に変えるのが最も効果が大きい。

理由:

```txt
- SPEC の中心である HTTP 402 と flovia offer を直接見せられる
- login / authorize / dashboard のバラバラ感を吸収できる
- hackathon demo で一番説明しやすい
- wallet-only -> verified discount の before / after を明確に演出できる
```

`/authorize` はその次に、budget / category / merchant / expiration を持つ policy setup UI にする。
