# NeuroVault NEAR DatasetMatcher Contract

A NEAR smart contract that records AI-powered dataset matching queries and their results on-chain.

## Architecture

The DatasetMatcher acts as an **on-chain oracle registry** for dataset matching:

1. A researcher submits a natural language query with structured filters via `submit_query`
2. The off-chain AI matching engine processes the query against available datasets
3. Match results (with deterministic, explainable scores) are stored on-chain via `store_match_results`
4. Anyone can read query history and match results via view methods

## Contract Methods

### Change Methods (require transaction)

- `submit_query({ naturalLanguage, minChannels, maxChannels, minDuration, maxDuration, taskType })` - Submit a new matching query. Returns a `queryId`.
- `store_match_results({ queryId, results })` - Store scored match results for a query.

### View Methods (free, no transaction)

- `get_matches({ queryId })` - Get match results for a query.
- `get_query({ queryId })` - Get a specific query by ID.
- `get_recent_queries({ limit })` - Get recent queries (newest first).
- `get_query_count()` - Get total number of queries submitted.

## Build

```bash
npm install
npm run build
```

The compiled WASM will be at `build/dataset_matcher.wasm`.

## Deploy

```bash
near deploy <your-account>.testnet build/dataset_matcher.wasm
```

## Scoring Breakdown

Each match result includes a transparent scoring breakdown:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Channel Compatibility | 25% | How well dataset channels match requirements |
| Duration Match | 20% | Recording length vs. requested range |
| Task Relevance | 30% | Task type alignment (exact match or category) |
| Text Similarity | 25% | Keyword overlap with natural language query |
