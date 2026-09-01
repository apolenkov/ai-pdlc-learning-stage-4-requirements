const url = process.env.ACCEPTANCE_URL ?? "http://127.0.0.1:4173/";

try {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  const body = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!body.includes("Эталон SDD · Кредитный калькулятор")) {
    throw new Error("expected product title is missing");
  }
  console.log(`acceptance:http: PASS — ${url} returned HTTP ${response.status} and the expected product title`);
} catch (error) {
  console.error(`acceptance:http: FAIL — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
