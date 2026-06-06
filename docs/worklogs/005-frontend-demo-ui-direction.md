# 005. Frontend Demo UI Direction

## 1. Goal

Base / Privy 向け demo で見せる frontend UI の方針を整理する。

今回の UI は「実装済み機能の一覧」ではなく、次の product story が一続きで伝わることを優先する。

```txt
merchant integrates Flovia SDK
  -> end user calls merchant API with Privy wallet
  -> wallet-only user receives normal x402 price
  -> user links X or GitHub through Privy
  -> same API call returns better price / better recommendation
  -> merchant dashboard shows conversion, lift, channel, and segment impact
```

## 2. Demo Screens

### 2.1 Merchant SDK Integration

merchant 視点の最初の画面。

見せたいこと:

- merchant は既存 endpoint を `floviaAdaptive402` で wrap するだけ。
- price / category / payment mode / next offer を merchant 側で宣言できる。
- merchant は raw Privy PII や linked account value を受け取らない。
- adaptive pricing は Flovia 側の identity / offer engine で決まる。

画面方針:

- hero の近くに短い SDK snippet を置く。
- `GET /api/premium-signal` を demo target として固定表示する。
- 「merchant-visible data」と「Flovia-internal identity signals」を明確に分けて表示する。

### 2.2 End User: Wallet-Only API Call

end user 視点の before 画面。

見せたいこと:

- Privy wallet で merchant API を呼び出す。
- HTTP 402 response が返る。
- response に `base_price`, `final_price`, `policy`, `reason_codes`, `discount unlock condition` が載る。
- wallet-only では discount がまだ効かず、通常 price になる。

表示例:

```txt
segment: wallet_only_privy_user
endpoint: GET /api/premium-signal
base_price: 0.05 USDC
final_price: 0.05 USDC
policy: base_price_until_verified
reason_codes: [low_identity_confidence]
unlock: link X or GitHub to unlock verified_user_discount
```

wallet 方針:

- 可能なら demo 前に wallet-only user と verified user を別々に用意する。
- 同一 wallet で link flow を live に見せる場合、before / after の比較カードを残して価格差が消えないようにする。
- demo 安定性を優先するなら「Wallet A: wallet only」「Wallet B: GitHub/X linked」の 2 persona 切り替え UI がよい。

### 2.3 End User: Verified API Call

end user 視点の after 画面。

見せたいこと:

- X or GitHub を Privy で link すると account trust が上がる。
- 同じ API call で price が下がる。
- paid response に追加で呼ぶべき API recommendation が返る。

表示例:

```txt
segment: verified_privy_user
endpoint: GET /api/premium-signal
base_price: 0.05 USDC
final_price: 0.025 USDC
policy: verified_user_discount
reason_codes: [verified_privy_user]
recommended_next_api: /api/premium-signal-plus
recommendation_type: starter_upsell or loyalty_bundle
```

UI 方針:

- before / after を横並びで見せる。
- price difference を最も大きく表示する。
- `response JSON` は詳細 drawer / secondary panel に逃がし、主役を price / policy / recommendation にする。
- 「merchant does not see GitHub handle / X handle」を補足として置く。

## 3. Merchant Dashboard

merchant 側 dashboard は、単なる request log ではなく「Flovia を入れたことで何が改善したか」を見せる。

### 3.1 Summary / Revenue Impact

上部 cards で以下を表示する。

- Requests
- Offers Returned
- Paid Conv.
- Revenue
- Revenue Lift
- Discount Conv.
- Bundle Conv.
- Premium Upsells

方針:

- `Revenue Lift` を主役カードにする。
- `Requests -> Offers Returned -> Paid Conv.` の funnel が一目で分かる配置にする。
- `Discount Conv.` と `Bundle Conv.` は Flovia 固有価値として Revenue の近くに置く。

### 3.2 Source Channel Performance

既存の kourin さんの Sankey 図を活用する。

channel 例:

- agentic.market
- hermes
- privy
- pay.sh

見せたいこと:

- どの channel が high-intent buyer を連れてきているか。
- channel ごとの request / conversion / revenue contribution が違うこと。
- Base team が resonate しやすい ecosystem 名を使うこと。

最低表示項目:

- Channel
- Requests
- Offers Returned
- Paid Conv.
- CVR
- Revenue
- Best Segment

### 3.3 Cross-API Usage / Bundle Insight

既存方針を維持し、paid response の `flovia_next_offer` と連動して見せる。

見せたいこと:

- initial API call の後に、agent が recommended next API を呼ぶ。
- bundle / upsell が追加 revenue を作る。
- returning buyer では `loyalty_bundle` が出る。

表示例:

```txt
/api/premium-signal -> /api/premium-signal-plus
starter_upsell selected: 4
loyalty_bundle selected: 2
bundle revenue: 0.32 USDC
```

### 3.4 Customer Segmentation Performance

Privy らしさを出すセクション。

segment 例:

- anonymous_wallet
- wallet_only_privy_user
- verified_privy_user
- repeat_privy_buyer

評価項目:

- Requests
- CVR
- ARPU

方針:

- `verified_privy_user` が wallet-only より高い CVR を出すことを見せる。
- `repeat_privy_buyer` は bundle / upsell の文脈で高 ARPU にする。
- raw identity ではなく normalized segment だけを merchant に見せる。

### 3.5 Offer Performance

offer type ごとの効果を見る。

offer 例:

```txt
verified_user_discount
Shown:
Selected:
Conversion:
Revenue:

signal_market_pack
Shown:
Selected:
Conversion:
Revenue:
```

方針:

- `Shown -> Selected -> Conversion` を funnel として表示する。
- discount offer と bundle offer を分ける。
- merchant が「どの incentive が効いたか」を判断できる UI にする。

## 4. Navigation / Demo Script

推奨 demo order:

1. `/` or `/merchant` で SDK integration を見せる。
2. `/agent` or main demo panel で wallet-only Privy user の API call を実行する。
3. 402 offer response の price / policy / unlock condition を見せる。
4. X or GitHub linked user に切り替える、または Privy link flow を実行する。
5. 同じ API call を再実行し、discounted price と recommendation を見せる。
6. simulate payment 後、merchant dashboard に移動する。
7. Summary / Sankey / Segments / Offer Performance で business impact を説明する。

## 5. AEO / Marketplace Discovery

余裕があれば AEO 比較を追加する。

比較対象例:

- agentic.market description
- pay.sh description
- merchant endpoint description

見せたいこと:

- agent が API を発見・比較するとき、description quality が conversion に影響する。
- Flovia offer metadata が agent decision に使える。
- channel performance と AEO quality を dashboard 上で接続できる。

優先度:

- core demo 完成後の optional。
- 最初の実装では static comparison card でよい。

## 6. Implementation Priority

Priority 1:

- demo story header / SDK snippet
- wallet-only vs verified price comparison
- 402 offer response summary
- paid response recommendation summary
- dashboard summary cards expansion

Priority 2:

- source channel Sankey
- customer segmentation table
- offer performance table
- cross-API bundle insight

Priority 3:

- AEO comparison
- persona switcher for prepared wallets
- richer dashboard filters / time range

## 7. Non-Goals For First Pass

- pricing engine の大幅変更。
- raw X / GitHub account values を merchant dashboard に表示すること。
- production-grade analytics backend。
- dashboard の完全な BI 化。
- AEO を core demo より優先すること。
