import {
  NearBindgen,
  near,
  call,
  view,
  UnorderedMap,
  Vector,
  LookupMap,
} from "near-sdk-js";

/** A researcher's search query submitted for AI matching */
class MatchQuery {
  queryId: string;
  caller: string;
  naturalLanguage: string;
  minChannels: u32;
  maxChannels: u32;
  minDuration: u32;
  maxDuration: u32;
  taskType: string;
  submittedAt: u64;

  constructor(fields: Partial<MatchQuery> = {}) {
    this.queryId = fields.queryId || "";
    this.caller = fields.caller || "";
    this.naturalLanguage = fields.naturalLanguage || "";
    this.minChannels = fields.minChannels || 0;
    this.maxChannels = fields.maxChannels || 0;
    this.minDuration = fields.minDuration || 0;
    this.maxDuration = fields.maxDuration || 0;
    this.taskType = fields.taskType || "";
    this.submittedAt = fields.submittedAt || BigInt(0) as unknown as u64;
  }
}

/** A single dataset match result with scoring breakdown */
class MatchResult {
  datasetId: string;
  dataCID: string;
  overallScore: u32; // 0-100
  channelScore: u32; // 0-100
  durationScore: u32; // 0-100
  taskScore: u32; // 0-100
  textScore: u32; // 0-100
  explanation: string;

  constructor(fields: Partial<MatchResult> = {}) {
    this.datasetId = fields.datasetId || "";
    this.dataCID = fields.dataCID || "";
    this.overallScore = fields.overallScore || 0;
    this.channelScore = fields.channelScore || 0;
    this.durationScore = fields.durationScore || 0;
    this.taskScore = fields.taskScore || 0;
    this.textScore = fields.textScore || 0;
    this.explanation = fields.explanation || "";
  }
}

/** Match results stored for a query */
class StoredMatch {
  queryId: string;
  results: MatchResult[];
  processedAt: u64;

  constructor(fields: Partial<StoredMatch> = {}) {
    this.queryId = fields.queryId || "";
    this.results = fields.results || [];
    this.processedAt = fields.processedAt || BigInt(0) as unknown as u64;
  }
}

type u32 = number;
type u64 = bigint;

@NearBindgen({})
class DatasetMatcher {
  /** All submitted queries, keyed by queryId */
  queries: UnorderedMap<string> = new UnorderedMap<string>("q");

  /** Match results keyed by queryId */
  matches: LookupMap<string> = new LookupMap<string>("m");

  /** Recent query IDs (newest first, capped at 50) */
  recentQueryIds: Vector<string> = new Vector<string>("r");

  /** Running counter for query IDs */
  nextQueryId: u32 = 0;

  /**
   * Submit a new dataset matching query.
   * Stores the query on-chain and returns a queryId for later retrieval.
   */
  @call({})
  submit_query({
    naturalLanguage,
    minChannels,
    maxChannels,
    minDuration,
    maxDuration,
    taskType,
  }: {
    naturalLanguage: string;
    minChannels: u32;
    maxChannels: u32;
    minDuration: u32;
    maxDuration: u32;
    taskType: string;
  }): string {
    const caller = near.predecessorAccountId();
    const queryId = `q-${this.nextQueryId}`;
    this.nextQueryId += 1;

    const query = new MatchQuery({
      queryId,
      caller,
      naturalLanguage: naturalLanguage || "",
      minChannels: minChannels || 0,
      maxChannels: maxChannels || 0,
      minDuration: minDuration || 0,
      maxDuration: maxDuration || 0,
      taskType: taskType || "",
      submittedAt: near.blockTimestamp(),
    });

    this.queries.set(queryId, JSON.stringify(query));

    // Track in recent list (cap at 50)
    this.recentQueryIds.push(queryId);
    if (this.recentQueryIds.length > 50) {
      // Remove oldest by swapping
      const temp: string[] = [];
      for (let i = this.recentQueryIds.length - 50; i < this.recentQueryIds.length; i++) {
        const val = this.recentQueryIds.get(i);
        if (val) temp.push(val);
      }
      this.recentQueryIds.clear();
      for (const v of temp) {
        this.recentQueryIds.push(v);
      }
    }

    near.log(`Query submitted: ${queryId} by ${caller}`);
    return queryId;
  }

  /**
   * Store match results for a previously submitted query.
   * Called by the AI matching engine (off-chain oracle) after scoring.
   */
  @call({})
  store_match_results({
    queryId,
    results,
  }: {
    queryId: string;
    results: MatchResult[];
  }): void {
    // Verify the query exists
    const queryStr = this.queries.get(queryId);
    if (!queryStr) {
      near.panicUtf8(new TextEncoder().encode(`Query ${queryId} not found`));
      return;
    }

    const storedMatch = new StoredMatch({
      queryId,
      results: results.map(
        (r) =>
          new MatchResult({
            datasetId: r.datasetId,
            dataCID: r.dataCID,
            overallScore: r.overallScore,
            channelScore: r.channelScore,
            durationScore: r.durationScore,
            taskScore: r.taskScore,
            textScore: r.textScore,
            explanation: r.explanation,
          })
      ),
      processedAt: near.blockTimestamp(),
    });

    this.matches.set(queryId, JSON.stringify(storedMatch));
    near.log(
      `Match results stored for ${queryId}: ${results.length} results`
    );
  }

  /**
   * Get match results for a specific query.
   */
  @view({})
  get_matches({ queryId }: { queryId: string }): StoredMatch | null {
    const matchStr = this.matches.get(queryId);
    if (!matchStr) return null;
    return JSON.parse(matchStr) as StoredMatch;
  }

  /**
   * Get a specific query by ID.
   */
  @view({})
  get_query({ queryId }: { queryId: string }): MatchQuery | null {
    const queryStr = this.queries.get(queryId);
    if (!queryStr) return null;
    return JSON.parse(queryStr) as MatchQuery;
  }

  /**
   * Get recent queries (newest first, up to `limit`).
   */
  @view({})
  get_recent_queries({ limit }: { limit: u32 }): MatchQuery[] {
    const max = Math.min(limit || 10, this.recentQueryIds.length);
    const result: MatchQuery[] = [];

    for (
      let i = this.recentQueryIds.length - 1;
      i >= this.recentQueryIds.length - max;
      i--
    ) {
      const qId = this.recentQueryIds.get(i);
      if (!qId) continue;
      const queryStr = this.queries.get(qId);
      if (queryStr) {
        result.push(JSON.parse(queryStr) as MatchQuery);
      }
    }

    return result;
  }

  /**
   * Get the total number of queries submitted.
   */
  @view({})
  get_query_count(): u32 {
    return this.nextQueryId;
  }
}
