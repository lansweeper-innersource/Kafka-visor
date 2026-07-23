# Investigation — Kafka producer compression: prd-euw1 vs prd-use2 (`public.edge.asset.event`)

- **Date:** 2026-06-09
- **Service:** adapter-api (`lec-adapter-consumer-asset`) + AssetMigrations producers
- **Env/Region:** prd / euw1 vs use2
- **Window:** 2026-05-26 → 2026-06-09
- **Jira:** ACME-49219 (epic ACME-50459 — DataScan maintenance 2026H1)
- **Sources used:** Honeycomb (✅), Quill deployment agent (✅), Prometheus (❌ Chrome not connected), Loki (not configured)

## Question
Topic-evolution reports showed `public.edge.asset.event` bytes/message dropping −24% in prd-use2 (compression working) but **rising +35% in prd-euw1** after the identical 2026-06-05 deploy of zstd producer compression (`KAFKA_ENABLE_COMPRESSION=true`, image v1.192.1). Why does euw1 not show the benefit?

## Decisive finding (REVISES the earlier "euw1 not working" verdict)
**Compression IS active in euw1.** Honeycomb producer spans (`ProduceEdgeMessage`, dataset `lec-adapter-consumer-asset.adapter-api`) expose the uncompressed application payload per message, `ls.edge.payload.total.bytes`, tagged by `cloud.region` / `k8s.cluster.name`:

| Region | Uncompressed payload AVG | Uncompressed P50 | On-disk b/msg (report) | Implied compression ratio |
|---|---|---|---|---|
| prd-use2 (`ls-prd-use2-core-eks`) | 158,706 B | 182,750 B | 13,087 | ~12.1× |
| prd-euw1 (`ls-prd-euw1-core-eks`) | 127,136 B | 114,276 B | 13,468 | ~9.4× |

On-disk bytes/message is ~10× smaller than the uncompressed producer payload in **both** regions → zstd compression is functioning in euw1 as well as use2.

**Why the report's euw1 number rose:** euw1's *uncompressed payload itself grew* over the window — AVG ~100K→144K B, P50 ~5K→159K B (**≈ +43%**), a genuine ramp in asset payload size in the euw1 region. With the compression ratio holding ~10×, on-disk bytes/message tracked the payload growth upward (+35%). The compression benefit is real but **masked by payload growth**.

**Why use2 dropped:** use2 uncompressed payload was ~flat (~159K B), while on-disk fell 17,255→13,087 — i.e. the compression ratio *improved* (~9.2×→~12.1×) around the 06-05 deploy. That is the clean, visible "win".

## Corrected conclusion
- prd-use2: ✅ compression working, clearly visible (ratio 9.2×→12.1×, flat payload).
- prd-euw1: ✅ compression also working (~9–10×); the report's rising bytes/message is a **measurement confound from +43% payload growth**, NOT a compression failure.
- The earlier "euw1 ❌ not working" read (and the deployment hypothesis "euw1 on old cluster ⇒ not compressing") is **refuted** by the producer-payload-vs-on-disk ratio.

## Secondary facts
- Both regions' adapter producers connect to different broker IPs (euw1 `172.20.73.124`, use2 `172.20.111.65`) — expected per-region; the cluster/migration difference is real but does **not** prevent producer-side compression.
- Deploy is identical across regions: image v1.192.1, `enableCompression: true`, promoted 2026-06-05 11:25/11:29 UTC.

## Confidence & gaps
- **High** that compression is active in euw1 (10× ratio, direct runtime measurement).
- **Medium** on the exact use2 mechanism (off→on vs codec/level change): pre-06-05 use2 was already ~9× compressed, so 06-05 looks like a ratio improvement rather than a pure enable. Not fully resolved.
- **Not measured (Prometheus down):** pod rollout confirmation, per-producer volume split on the euw1 topic, broker-side `compression.type`. Re-run once Chrome/Prometheus is linked: `https://prometheus.euw1.prd.lansweepertools.com`.
- Producer payload measured on `lec-adapter-consumer-asset` only (dominant but not sole producer to the topic).
