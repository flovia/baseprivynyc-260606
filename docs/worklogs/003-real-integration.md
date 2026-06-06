# 003-real-integration: Replace Simulation With Real Privy, x402, And Postgres

## Goal

`002-xxx` で固めた simulation contract を維持したまま、本物の production integration に差し替える。

優先する完成状態:

- real Privy React SDK login / account linking / embedded wallet flow が動く。
- Flovia API が Privy user identity を server-side に解決し、merchant へ identity を漏らさない。
- real x402 facilitator verification / settlement verification が `paymentMode: "x402"` で有効になる。
- Drizzle + Postgres で users / quotes / request events / payment events が永続化される。
- `/v1/dev/*` simulation endpoints が production で無効化される。
- dashboard frontend が production persistence の data を読む。

## Non-Goals

- Pricing policy の大幅変更。
- ML-based offer engine。
- Public SDK publishing / npm release automation。
- Cross-merchant identity sharing UI。
- Privy 以外の wallet provider 対応。

## Current Contract To Preserve

- Merchant-visible `flovia` extension は flat snake_case。
- `flovia` に buyer / quote_id / request_id / agent_score を含めない。
- `quote_id` / `request_id` は `accepts[0].extra` に入れる。
- `flovia.final_price` が current request の支払い額。
- `flovia_next_offer` は paid response の optional post-payment offer で、settled amount を変更しない。
- Segment enum は `anonymous_wallet` / `low_assurance_privy_user` / `verified_privy_user`。

## Phase 1: Privy Production Identity

目的: dev user store を real Privy user resolution に置き換える。

Status: 🔧 partial

実装済み:

- `apps/web` に `@privy-io/react-auth` を追加。
- root layout に `PrivyProvider` を追加し、browser-safe `publicAuthConfig` だけを client provider に渡す。
- `/login` を real Privy login / wallet connect / account linking / identity sync UI に差し替え。
- `apps/api` に `@privy-io/server-auth` based wrapper を追加。
- `POST /v1/auth/privy/sync` で Privy identity token を検証し、Flovia user store に normalized identity を保存。
- Privy linked accounts は `email` / `farcaster` / `github` / `passkey` flags に正規化し、raw account values は保存しない。
- `publicAuthConfig` は `NEXT_PUBLIC_*` のみに限定。`serverAuthConfig` は API server-only path で使用。
- `/v1/dev/*` は `FLOVIA_ENABLE_DEV_ENDPOINTS=true` または `NODE_ENV=test` の時だけ mount する。
- Real Privy sync は authoritative identity update として扱い、Privy 側で account unlink された場合は confidence を downgrade できる。
- Real Privy sync は agent authorization を自動付与しない。authorization は別 consent flow で扱う。

残:

- real browser での Privy login / link flow manual QA。
- agent authorization consent の real Privy session UX への統合。
- wallet alias / Privy DID persistence を Postgres phase で正式化。

実装内容:

- `apps/web` に Privy React SDK を導入。
- `/login` を real Privy login UI に差し替える。
- account linking UI で email / Farcaster / GitHub / passkey / MFA を Privy に追加。
- backend 用 Privy verification client を追加し、wallet -> Privy DID / linked accounts を server-side 解決する。
- `FloviaUser` persistence は Privy DID を canonical user key、wallet は linked wallet alias として扱う。
- agent authorization は user consent として DB に保存する。

注意点:

- Merchant から identity metadata を受け取らない方針は維持。
- Linked account raw values は保存しない。保存するのは normalized confidence / account type flags / timestamps。
- Privy token / app secret は server-side env のみ。

検証:

- wallet-only Privy user -> `low_assurance_privy_user` / `unlockable_discount`。
- email or Farcaster linked user -> `verified_privy_user` / `verified_user_discount`。
- unauthorized agent -> base price fallback。

## Phase 2: x402 Facilitator Verification

目的: `paymentMode: "x402"` を placeholder から real verification path にする。

実装内容:

- SDK の `paymentMode: "x402"` で `X-PAYMENT` を facilitator に verify/settle する。
- `simulation` payment header parsing は `paymentMode: "simulation"` に限定する。
- `accepts[0]` を facilitator が要求する exact x402 schema に合わせる。
- `asset`, `network`, `maxAmountRequired`, `payTo` の validation を強化。
- quote amount と settled amount の一致を atomic units で検証する。
- replay protection: quote TTL、tx hash / payment payload idempotency、wallet mismatch 409 を維持。

検証:

- unpaid request -> 402。
- valid x402 payment retry -> merchant 200 + payment event recorded。
- amount mismatch / expired quote / wallet mismatch / replay -> reject。

## Phase 3: Drizzle + Postgres Persistence

目的: in-memory store を production persistence に置き換える。

Tables:

- `flovia_users`: privy_did, primary_wallet, identity_confidence, linked_account_types, created_at, updated_at。
- `wallet_aliases`: wallet, privy_did, first_seen_at, last_seen_at。
- `agent_authorizations`: privy_did, merchant_id, agent_wallet, scopes, status, created_at, revoked_at。
- `quotes`: quote_id, request_id, merchant_id, endpoint, wallet, privy_did, offer_json, reason_codes, expires_at, created_at。
- `request_events`: request_id, quote_id, merchant_id, endpoint, wallet, status, final_price, policy, offer_type, timestamp。
- `payment_events`: request_id, quote_id, merchant_id, endpoint, wallet, amount, currency, network, tx_hash, offer_selected, timestamp。

実装内容:

- `packages/db` に repository interface を切り、memory と postgres implementations を分ける。
- Drizzle schema / migrations を追加。
- dashboard aggregation を SQL backed に変更。
- local dev は env により memory fallback 可能にする。

検証:

- API restart 後も dashboard / paid history が残る。
- first payment -> `starter_upsell`、2+ payments -> `loyalty_bundle` が persistence 由来で動く。

## Phase 4: Production Gate For Dev Endpoints

目的: simulation endpoints を production で誤公開しない。

実装内容:

- `/v1/dev/*` を `NODE_ENV !== "production"` か `FLOVIA_ENABLE_DEV_ENDPOINTS=true` の時だけ mount。
- production では 404 を返す。
- README / deployment docs に env contract を明記。
- tests で production gate を固定。

## Phase 5: Frontend Production Dashboard

目的: real data operation UI にする。

実装内容:

- dashboard fetch に auth/session boundary を追加。
- loading / empty / error states を整える。
- recent requests table に server pagination を追加。
- revenue は settled payment events のみから表示する。
- dev-only login simulation UI を real Privy UI に置き換える。

## Phase 6: Test And E2E Matrix

追加する tests:

- Privy identity normalization: wallet-only / verified contact / verified social / strong auth。
- x402 verification: success / mismatch / replay / expired quote。
- Postgres repository: quote TTL / idempotent events / dashboard aggregation。
- production gate: `/v1/dev/*` disabled by default in production。
- frontend build + dashboard API fallback。

Verification commands:

```bash
bun run typecheck
bun run test
bun run --filter='web' build
bun run e2e
```

## Acceptance Criteria

- Real Privy login can create wallet-only and verified users.
- Merchant never receives raw identity, Privy DID, linked account values, or agent score.
- `paymentMode: "x402"` verifies a real payment before serving protected merchant handlers.
- Postgres-backed dashboard survives API restart.
- `/v1/dev/*` is not reachable in production by default.
- Simulation mode remains usable for local demo and tests.

## Risks

- Privy wallet/user lookup semantics may require async reconciliation or webhooks.
- x402 facilitator exact schema may differ from current placeholder shape.
- Persisted identity data needs strict minimization and deletion/revocation behavior.
- Migration from memory to Postgres can change dashboard aggregation edge cases.
