import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  PRIVATE_AGGREGATE_OUTPUT,
  PRIVATE_SNAPSHOT_OUTPUT,
  RiotApiError,
  buildAnonymizedAggregate,
  buildDryRunPlan,
  buildLeagueEntriesUrl,
  buildMatchIdsUrl,
  buildMatchUrl,
  collectSnapshot,
  createFixtureClient,
  createRiotApiClient,
  exhaustedRateLimitDelayMs,
  loadFixture,
  parseCliArgs,
  parseRetryAfterMs,
  snapshotSummary,
  writePrivateAggregate,
  writePrivateSnapshot,
} from './lib.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(scriptDirectory, 'cli.mjs');
const fixturePath = path.join(scriptDirectory, 'fixtures/offline-snapshot.json');

test('CLI defaults to a zero-network dry run', () => {
  const options = parseCliArgs([]);
  const plan = buildDryRunPlan(options);
  assert.equal(options.mode, 'dry-run');
  assert.equal(options.write, false);
  assert.equal(plan.networkRequests, 0);
  assert.equal(plan.writes, 0);
  assert.deepEqual(plan.apiFamilies, ['tft-league-v1', 'tft-match-v1']);
  assert.deepEqual(plan.privateOutputs, {
    rawSnapshot: PRIVATE_SNAPSHOT_OUTPUT,
    anonymizedAggregate: PRIVATE_AGGREGATE_OUTPUT,
  });
});

test('CLI rejects CN, mismatched routes, key arguments, and implicit writes', () => {
  assert.throws(() => parseCliArgs(['--platform', 'cn1']), /rejects CN/);
  assert.throws(
    () => parseCliArgs(['--platform', 'na1', '--region', 'asia']),
    /must use regional route americas/,
  );
  assert.throws(() => parseCliArgs(['--api-key', 'do-not-accept']), /Unknown option/);
  assert.throws(() => parseCliArgs(['--write']), /requires either --live or --offline/);
  assert.throws(() => parseCliArgs(['--live', '--offline']), /cannot be used together/);
});

test('live CLI fails closed when RIOT_API_KEY is absent', () => {
  const environment = { ...process.env };
  delete environment.RIOT_API_KEY;
  const result = spawnSync(process.execPath, [cliPath, '--live'], {
    encoding: 'utf8',
    env: environment,
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /requires RIOT_API_KEY/);
});

test('URL builders use only documented TFT endpoint families', () => {
  const options = parseCliArgs(['--offline', '--matches', '2']);
  assert.equal(
    buildLeagueEntriesUrl(options).toString(),
    'https://na1.api.riotgames.com/tft/league/v1/entries/GOLD/I?page=1',
  );
  assert.equal(
    buildMatchIdsUrl(options, 'fixture/player').toString(),
    'https://americas.api.riotgames.com/tft/match/v1/matches/by-puuid/fixture%2Fplayer/ids?start=0&count=2',
  );
  assert.equal(
    buildMatchUrl(options, 'NA1_123').toString(),
    'https://americas.api.riotgames.com/tft/match/v1/matches/NA1_123',
  );
});

test('offline fixture mode is deterministic and validates both API families', async () => {
  const options = parseCliArgs(['--offline']);
  const fixture = await loadFixture(fixturePath);

  const makeSnapshot = () =>
    collectSnapshot(options, {
      requestJson: createFixtureClient(fixture).requestJson,
      capturedAt: fixture.fixture.capturedAt,
    });

  const first = await makeSnapshot();
  const second = await makeSnapshot();
  assert.deepEqual(first, second);
  assert.equal(first.playerMatches[0].puuid, 'fixture-player-a');
  assert.equal(first.playerMatches[0].matches[0].metadata.match_id, 'NA1_FIXTURE_0001');
  assert.deepEqual(snapshotSummary(first), {
    mode: 'offline',
    apiFamilies: ['tft-league-v1', 'tft-match-v1'],
    platform: 'na1',
    region: 'americas',
    leagueEntries: 2,
    selectedPlayers: 1,
    matchIds: 1,
    matchDetails: 1,
  });
});

test('offline fixture rejects parameters it does not represent', async () => {
  const fixture = await loadFixture(fixturePath);
  const options = parseCliArgs([
    '--offline',
    '--tier',
    'PLATINUM',
    '--division',
    'IV',
  ]);
  await assert.rejects(
    collectSnapshot(options, {
      requestJson: createFixtureClient(fixture).requestJson,
      capturedAt: fixture.fixture.capturedAt,
    }),
    /only supports its declared league query/,
  );
});

test('anonymized aggregate is deterministic and contains the requested metrics', async () => {
  const options = parseCliArgs(['--offline', '--players', '2']);
  const fixture = await loadFixture(fixturePath);
  const snapshot = await collectSnapshot(options, {
    requestJson: createFixtureClient(fixture).requestJson,
    capturedAt: fixture.fixture.capturedAt,
  });

  const first = buildAnonymizedAggregate(snapshot);
  const second = buildAnonymizedAggregate(snapshot);
  assert.deepEqual(first, second);
  assert.equal(first.sampleCount, 2);
  assert.deepEqual(first.metrics, {
    averagePlacement: 3,
    topFourRate: 1,
    firstPlaceRate: 0,
  });
  assert.deepEqual(first.contexts, {
    gameVersions: [{ gameVersion: 'Version 16.18.1 (fixture)', sampleCount: 2 }],
    tftSets: [{ tftSetNumber: 18, sampleCount: 2 }],
    queues: [{ queueId: 1100, sampleCount: 2 }],
  });
  assert.equal(first.compositions.length, 1);
  assert.equal(
    first.compositions[0].fingerprint,
    'sha256:828648de935398073d0b46d6de4f0e476985fa2a62f7ca22d2dd9fbba60074c5',
  );
  assert.deepEqual(first.compositions[0].unitCharacterIds, [
    'TFT18_Ahri_Fixture',
    'TFT18_Zed_Fixture',
  ]);
  assert.equal(first.compositions[0].gameVersion, 'Version 16.18.1 (fixture)');
  assert.equal(first.compositions[0].tftSetNumber, 18);
  assert.equal(first.compositions[0].queueId, 1100);
  assert.deepEqual(first.compositions[0].metrics, first.metrics);
  assert.deepEqual(first.compositions[0].units, [
    {
      characterId: 'TFT18_Ahri_Fixture',
      appearances: 2,
      tiers: [
        { tier: 2, appearances: 1 },
        { tier: 3, appearances: 1 },
      ],
      itemNames: [{ itemName: 'TFT_Item_Beta_Fixture', appearances: 2 }],
    },
    {
      characterId: 'TFT18_Zed_Fixture',
      appearances: 2,
      tiers: [{ tier: 2, appearances: 2 }],
      itemNames: [
        { itemName: 'TFT_Item_Alpha_Fixture', appearances: 2 },
        { itemName: 'TFT_Item_Zeta_Fixture', appearances: 1 },
      ],
    },
  ]);
});

test('anonymized aggregate excludes raw player, Riot ID, and match identifiers', async () => {
  const options = parseCliArgs(['--offline', '--players', '2']);
  const fixture = await loadFixture(fixturePath);
  const snapshot = await collectSnapshot(options, {
    requestJson: createFixtureClient(fixture).requestJson,
    capturedAt: fixture.fixture.capturedAt,
  });
  const aggregate = buildAnonymizedAggregate(snapshot);
  const serialized = JSON.stringify(aggregate);

  for (const identifier of [
    'fixture-player-a',
    'fixture-player-b',
    'fixture-opponent-a',
    'fixture-opponent-b',
    'fixture-summoner-a',
    'fixture-summoner-b',
    'PrivateFixtureAlpha',
    'PrivateFixtureBeta',
    'PrivateFixtureOpponentA',
    'PrivateFixtureOpponentB',
    'NA1_FIXTURE_0001',
    'NA1_FIXTURE_0002',
  ]) {
    assert.equal(serialized.includes(identifier), false, `aggregate leaked ${identifier}`);
  }

  function assertNoForbiddenKeys(value) {
    if (Array.isArray(value)) {
      value.forEach(assertNoForbiddenKeys);
      return;
    }
    if (value === null || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.doesNotMatch(
        key,
        /^(?:puuid|match_?ids?|summoner(?:id|name)|riotid.*|participants?|account_?id|player_?id)$/i,
      );
      assertNoForbiddenKeys(child);
    }
  }
  assertNoForbiddenKeys(aggregate);
});

test('aggregate ordering is independent of raw player, participant, unit, and item order', async () => {
  const options = parseCliArgs(['--offline', '--players', '2']);
  const fixture = await loadFixture(fixturePath);
  const snapshot = await collectSnapshot(options, {
    requestJson: createFixtureClient(fixture).requestJson,
    capturedAt: fixture.fixture.capturedAt,
  });
  const reordered = structuredClone(snapshot);
  reordered.playerMatches.reverse();
  for (const player of reordered.playerMatches) {
    player.matches.reverse();
    for (const match of player.matches) {
      match.info.participants.reverse();
      for (const participant of match.info.participants) {
        participant.units?.reverse();
        for (const unit of participant.units ?? []) unit.itemNames?.reverse();
      }
    }
  }

  assert.deepEqual(buildAnonymizedAggregate(reordered), buildAnonymizedAggregate(snapshot));
});

test('identical compositions from different game contexts are not mixed', async () => {
  const options = parseCliArgs(['--offline', '--players', '2']);
  const fixture = await loadFixture(fixturePath);
  const snapshot = await collectSnapshot(options, {
    requestJson: createFixtureClient(fixture).requestJson,
    capturedAt: fixture.fixture.capturedAt,
  });
  snapshot.playerMatches[1].matches[0].info.game_version = 'Version 16.19.1 (fixture)';
  snapshot.playerMatches[1].matches[0].info.tft_set_number = 19;
  snapshot.playerMatches[1].matches[0].info.queue_id = 1110;

  const aggregate = buildAnonymizedAggregate(snapshot);
  assert.equal(aggregate.compositions.length, 2);
  assert.deepEqual(
    aggregate.compositions.map((composition) => [
      composition.gameVersion,
      composition.tftSetNumber,
      composition.queueId,
      composition.sampleCount,
    ]),
    [
      ['Version 16.18.1 (fixture)', 18, 1100, 1],
      ['Version 16.19.1 (fixture)', 19, 1110, 1],
    ],
  );
  assert.equal(aggregate.compositions[0].fingerprint, aggregate.compositions[1].fingerprint);
});

test('empty aggregate reports null metrics without identifiers', () => {
  const aggregate = buildAnonymizedAggregate({
    capturedAt: '2026-09-04T00:00:00.000Z',
    source: {
      provider: 'Riot Games API',
      mode: 'offline',
      apiFamilies: ['tft-league-v1', 'tft-match-v1'],
      platform: 'na1',
      region: 'americas',
    },
    query: { tier: 'GOLD', division: 'I', page: 1 },
    leagueEntries: [],
    playerMatches: [],
  });
  assert.equal(aggregate.sampleCount, 0);
  assert.deepEqual(aggregate.metrics, {
    averagePlacement: null,
    topFourRate: null,
    firstPlaceRate: null,
  });
  assert.deepEqual(aggregate.compositions, []);
});

test('live client sends the key only as X-Riot-Token and snapshot never persists it', async () => {
  const apiKey = 'test-key-do-not-persist';
  const userAgent = 'YiluCompanion/Test';
  const fixture = await loadFixture(fixturePath);
  const seenRequests = [];
  const fixtureClient = createFixtureClient(fixture);
  let now = 0;

  const client = createRiotApiClient({
    apiKey,
    userAgent,
    minDelayMs: 1_250,
    maxRetries: 0,
    nowFn: () => now,
    sleepFn: async (milliseconds) => {
      now += milliseconds;
    },
    fetchImpl: async (url, init) => {
      seenRequests.push({ url: url.toString(), init });
      const body = await fixtureClient.requestJson(url);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  const options = parseCliArgs(['--live']);
  const snapshot = await collectSnapshot(options, {
    requestJson: client.requestJson,
    capturedAt: '2026-09-04T00:00:00.000Z',
  });
  assert.equal(seenRequests.length, 3);
  for (const request of seenRequests) {
    assert.equal(request.init.headers['X-Riot-Token'], apiKey);
    assert.equal(request.init.headers['User-Agent'], userAgent);
    assert.doesNotMatch(request.url, /test-key-do-not-persist/);
  }
  assert.doesNotMatch(JSON.stringify(snapshot), /test-key-do-not-persist/);
});

test('429 Retry-After is honored before retrying', async () => {
  let calls = 0;
  let now = 0;
  const sleeps = [];
  const client = createRiotApiClient({
    apiKey: 'test-key',
    userAgent: 'YiluCompanion/Test',
    minDelayMs: 1_250,
    maxRetries: 1,
    nowFn: () => now,
    sleepFn: async (milliseconds) => {
      sleeps.push(milliseconds);
      now += milliseconds;
    },
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return new Response('', { status: 429, headers: { 'Retry-After': '2' } });
      return new Response('{"ok":true}', { status: 200 });
    },
  });

  const result = await client.requestJson(
    new URL('https://na1.api.riotgames.com/tft/league/v1/entries/GOLD/I?page=1'),
    'test',
  );
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(sleeps, [2_000]);
});

test('rate-limit response headers delay the next request', async () => {
  let now = 0;
  const sleeps = [];
  const client = createRiotApiClient({
    apiKey: 'test-key',
    userAgent: 'YiluCompanion/Test',
    minDelayMs: 1_250,
    maxRetries: 0,
    nowFn: () => now,
    sleepFn: async (milliseconds) => {
      sleeps.push(milliseconds);
      now += milliseconds;
    },
    fetchImpl: async () =>
      new Response('{"ok":true}', {
        status: 200,
        headers: {
          'X-App-Rate-Limit': '1:2,100:120',
          'X-App-Rate-Limit-Count': '1:2,1:120',
        },
      }),
  });

  const url = new URL('https://na1.api.riotgames.com/tft/league/v1/entries/GOLD/I?page=1');
  await client.requestJson(url, 'first');
  await client.requestJson(url, 'second');
  assert.deepEqual(sleeps, [2_000]);
});

test('client refuses unsafe direct-call throttling and malformed secrets', () => {
  assert.throws(
    () =>
      createRiotApiClient({
        apiKey: 'test-key',
        userAgent: 'YiluCompanion/Test',
        minDelayMs: 0,
      }),
    /between 1250 and 60000/,
  );
  assert.throws(
    () =>
      createRiotApiClient({
        apiKey: 'test-key\nheader-injection',
        userAgent: 'YiluCompanion/Test',
      }),
    /invalid format/,
  );
});

test('client refuses CN and non-TFT hosts before making a request', async () => {
  let calls = 0;
  const client = createRiotApiClient({
    apiKey: 'test-key',
    userAgent: 'YiluCompanion/Test',
    fetchImpl: async () => {
      calls += 1;
      return new Response('{}', { status: 200 });
    },
  });

  await assert.rejects(
    client.requestJson(
      new URL('https://cn1.api.riotgames.com/tft/league/v1/entries/GOLD/I?page=1'),
      'test',
    ),
    /unsupported Riot API host/,
  );
  await assert.rejects(
    client.requestJson(new URL('https://example.com/tft/match/v1/matches/123'), 'test'),
    /unsupported Riot API host/,
  );
  assert.equal(calls, 0);
});

test('Retry-After and rate-limit parsers handle seconds, dates, and windows', () => {
  assert.equal(parseRetryAfterMs('1.5', 0), 1_500);
  assert.equal(parseRetryAfterMs('Thu, 01 Jan 1970 00:00:03 GMT', 1_000), 2_000);
  assert.equal(parseRetryAfterMs('invalid', 0), null);
  const headers = new Headers({
    'X-Method-Rate-Limit': '20:1,100:120',
    'X-Method-Rate-Limit-Count': '20:1,99:120',
  });
  assert.equal(exhaustedRateLimitDelayMs(headers), 1_000);
});

test('HTTP errors do not expose key or response body', async () => {
  const apiKey = 'sensitive-test-key';
  const client = createRiotApiClient({
    apiKey,
    userAgent: 'YiluCompanion/Test',
    minDelayMs: 1_250,
    maxRetries: 0,
    fetchImpl: async () =>
      new Response(`server reflected ${apiKey}`, { status: 403, statusText: 'Forbidden' }),
  });

  await assert.rejects(
    client.requestJson(
      new URL('https://na1.api.riotgames.com/tft/league/v1/entries/GOLD/I?page=1'),
      'test',
    ),
    (error) =>
      error instanceof RiotApiError &&
      error.message.includes('HTTP 403') &&
      !error.message.includes(apiKey) &&
      !error.message.includes('server reflected'),
  );
});

test('private writer stays under .private-data and uses restrictive permissions', async (context) => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'riot-tft-manual-'));
  context.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));

  const snapshot = { schemaVersion: 1, marker: 'private-only' };
  const outputPath = await writePrivateSnapshot(temporaryRoot, snapshot);
  assert.equal(outputPath, path.join(temporaryRoot, PRIVATE_SNAPSHOT_OUTPUT));
  assert.deepEqual(JSON.parse(await fs.readFile(outputPath, 'utf8')), snapshot);

  const aggregate = { schemaVersion: 1, marker: 'anonymous-private-only' };
  const aggregatePath = await writePrivateAggregate(temporaryRoot, aggregate);
  assert.equal(aggregatePath, path.join(temporaryRoot, PRIVATE_AGGREGATE_OUTPUT));
  assert.deepEqual(JSON.parse(await fs.readFile(aggregatePath, 'utf8')), aggregate);

  const stat = await fs.stat(outputPath);
  const aggregateStat = await fs.stat(aggregatePath);
  assert.equal(stat.mode & 0o777, 0o600);
  assert.equal(aggregateStat.mode & 0o777, 0o600);
  const privateDirectoryStat = await fs.stat(path.join(temporaryRoot, '.private-data'));
  const outputDirectoryStat = await fs.stat(path.dirname(outputPath));
  assert.equal(privateDirectoryStat.mode & 0o777, 0o700);
  assert.equal(outputDirectoryStat.mode & 0o777, 0o700);
});

test('private writer refuses a symlink escape', async (context) => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'riot-tft-symlink-'));
  const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'riot-tft-outside-'));
  context.after(async () => {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
    await fs.rm(outsideRoot, { recursive: true, force: true });
  });

  await fs.symlink(outsideRoot, path.join(temporaryRoot, '.private-data'));
  await assert.rejects(
    writePrivateSnapshot(temporaryRoot, { schemaVersion: 1 }),
    /symlinked \.private-data directory/,
  );
  await assert.rejects(fs.access(path.join(outsideRoot, 'riot-tft/manual-snapshot.json')));
});
