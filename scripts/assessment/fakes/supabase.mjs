// In-memory stand-in for @supabase/supabase-js, used only by scripts/assessment/test-stages.mjs.
// It implements just the calls the assessment routes make, with the same semantics as the real
// database functions (see supabase/migrations/20261116001300_central_assessment.sql), so the real
// route, auth checks and policy code run unchanged. State lives on globalThis so the test can seed it.

export function fakeState() {
  globalThis.__fakeSupabase ??= {
    tables: {},
    /** token -> user */
    users: {},
    /** user id -> child ids the user may write results for */
    access: {},
    rateLimit: true,
  };
  return globalThis.__fakeSupabase;
}

export function resetFakeState() {
  delete globalThis.__fakeSupabase;
  return fakeState();
}

const ok = (data) => ({ data, error: null });
const fail = (code, message = code) => ({ data: null, error: { code, message } });

class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.sorts = [];
    this.max = Infinity;
    this.mode = "many";
    this.values = undefined;
  }
  rows() {
    const state = fakeState();
    return (state.tables[this.table] ??= []);
  }
  select() {
    return this;
  }
  eq(column, value) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  in(column, values) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }
  is(column, value) {
    this.filters.push((row) => (row[column] ?? null) === value);
    return this;
  }
  gte(column, value) {
    this.filters.push((row) => row[column] >= value);
    return this;
  }
  insert(values) {
    this.inserting = Array.isArray(values) ? values : [values];
    return this;
  }
  order(column, options = {}) {
    this.sorts.push([column, options.ascending !== false]);
    return this;
  }
  limit(count) {
    this.max = count;
    return this;
  }
  update(values) {
    this.values = values;
    return this;
  }
  single() {
    this.mode = "single";
    return this.run();
  }
  maybeSingle() {
    this.mode = "maybe";
    return this.run();
  }
  then(resolve, reject) {
    return this.run().then(resolve, reject);
  }
  async run() {
    if (this.inserting) {
      const now = new Date().toISOString();
      for (const value of this.inserting)
        this.rows().push({ id: crypto.randomUUID(), created_at: now, ...structuredClone(value) });
      return ok(null);
    }
    let rows = this.rows().filter((row) => this.filters.every((filter) => filter(row)));
    if (this.values) {
      for (const row of rows) Object.assign(row, structuredClone(this.values));
      return ok(null);
    }
    for (const [column, ascending] of [...this.sorts].reverse())
      rows = [...rows].sort((a, b) => (a[column] > b[column] ? 1 : a[column] < b[column] ? -1 : 0) * (ascending ? 1 : -1));
    rows = rows.slice(0, this.max).map((row) => structuredClone(row));
    if (this.mode === "single") return rows.length === 1 ? ok(rows[0]) : fail("PGRST116", "expected one row");
    if (this.mode === "maybe") return rows.length > 1 ? fail("PGRST116", "more than one row") : ok(rows[0] ?? null);
    return ok(rows);
  }
}

function claimAssessment({ p_row: row }) {
  const state = fakeState();
  const results = (state.tables.assessment_results ??= []);
  const existing = results.find((item) => item.id === row.id);
  if (existing) {
    if (existing.recorded_by !== row.recorded_by || existing.input_hash !== row.input_hash)
      return fail("23505", "request id reused");
    return ok({ claimed: false, row: structuredClone(existing) });
  }
  const now = Date.now();
  const mine = results.filter((item) => item.recorded_by === row.recorded_by);
  if (
    state.rateLimit &&
    (mine.filter((item) => now - Date.parse(item.created_at) < 60000).length >= 12 ||
      mine.some((item) => item.state === "processing" && now - Date.parse(item.created_at) < 35000))
  )
    return fail("P0001", "assessment rate limit");
  results.push({ ...row, state: "processing", result: null, adult_review: null, created_at: new Date(now).toISOString() });
  return ok({ claimed: true });
}

export function createClient(_url, _key, options = {}) {
  const state = fakeState();
  const authorization = options.global?.headers?.Authorization ?? "";
  const callerToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  return {
    auth: {
      async getUser(token) {
        const user = state.users[token];
        return user ? ok({ user }) : { data: { user: null }, error: { message: "invalid token" } };
      },
    },
    from: (table) => new Query(table),
    async rpc(name, args) {
      if (name === "claim_assessment") return claimAssessment(args);
      if (name === "can_access_learning_results") {
        const user = state.users[callerToken];
        return ok(!!user && (state.access[user.id] ?? []).includes(args.p_child_id));
      }
      return fail("42883", `fake rpc not implemented: ${name}`);
    },
  };
}
