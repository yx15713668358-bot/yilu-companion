import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_OPTIONS = Object.freeze({
  mode: 'dry-run',
  platform: 'na1',
  region: 'americas',
  tier: 'GOLD',
  division: 'I',
  page: 1,
  players: 1,
  matches: 1,
  write: false,
  minDelayMs: 1_250,
  maxRetries: 3,
  userAgent: 'YiluCompanion/7.0 (manual-local Riot-TFT-API prototype)',
});

export const PRIVATE_SNAPSHOT_OUTPUT = '.private-data/riot-tft/manual-snapshot.json';
export const PRIVATE_AGGREGATE_OUTPUT = '.private-data/riot-tft/manual-aggregate.json';

const PLATFORM_TO_REGION = Object.freeze({
  br1: 'americas',
  la1: 'americas',
  la2: 'americas',
  na1: 'americas',
  jp1: 'asia',
  kr: 'asia',
  eun1: 'europe',
  euw1: 'europe',
  ru: 'europe',
  tr1: 'europe',
});

const PLATFORM_HOSTS = new Set(
  Object.keys(PLATFORM_TO_REGION).map((platform) => `${platform}.api.riotgames.com`),
);
const REGIONAL_HOSTS = new Set(
  [...new Set(Object.values(PLATFORM_TO_REGION))].map(
    (region) => `${region}.api.riotgames.com`,
  ),
);

const TIERS = new Set([
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
]);

const DIVISIONS = new Set(['I', 'II', 'III', 'IV']);
const VALUE_FLAGS = new Set([
  'platform',
  'region',
  'tier',
  'division',
  'page',
  'players',
  'matches',
  'min-delay-ms',
  'max-retries',
  'user-agent',
]);
const BOOLEAN_FLAGS = new Set(['live', 'offline', 'write', 'help']);

export class CliError extends Error {}
export class RiotApiError extends Error {}
export class FixtureError extends Error {}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function parseInteger(value, label, minimum, maximum) {
  if (!/^\d+$/.test(String(value))) {
    throw new CliError(`--${label} must be an integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new CliError(`--${label} must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function validateUserAgent(value) {
  const userAgent = requireNonEmptyString(value, '--user-agent').trim();
  if (userAgent.length > 200 || /[\u0000-\u001f\u007f]/.test(userAgent)) {
    throw new CliError('--user-agent must be 1-200 printable characters.');
  }
  return userAgent;
}

export function parseCliArgs(argv) {
  const raw = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--') || token === '--') {
      throw new CliError(`Unknown positional argument: ${token}`);
    }

    const flag = token.slice(2);
    if (BOOLEAN_FLAGS.has(flag)) {
      if (hasOwn(raw, flag)) throw new CliError(`Duplicate flag: --${flag}`);
      raw[flag] = true;
      continue;
    }

    if (!VALUE_FLAGS.has(flag)) throw new CliError(`Unknown option: --${flag}`);
    if (hasOwn(raw, flag)) throw new CliError(`Duplicate option: --${flag}`);

    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new CliError(`Missing value for --${flag}.`);
    }
    raw[flag] = value;
    index += 1;
  }

  if (raw.live && raw.offline) {
    throw new CliError('--live and --offline cannot be used together.');
  }

  const mode = raw.live ? 'live' : raw.offline ? 'offline' : 'dry-run';
  if (raw.write && mode === 'dry-run') {
    throw new CliError('--write requires either --live or --offline.');
  }

  const platform = String(raw.platform ?? DEFAULT_OPTIONS.platform).toLowerCase();
  const region = String(raw.region ?? DEFAULT_OPTIONS.region).toLowerCase();
  const expectedRegion = PLATFORM_TO_REGION[platform];
  if (!expectedRegion) {
    throw new CliError(
      `Unsupported platform: ${platform}. This prototype intentionally rejects CN and undocumented routes.`,
    );
  }
  if (region !== expectedRegion) {
    throw new CliError(`Platform ${platform} must use regional route ${expectedRegion}.`);
  }

  const tier = String(raw.tier ?? DEFAULT_OPTIONS.tier).toUpperCase();
  const division = String(raw.division ?? DEFAULT_OPTIONS.division).toUpperCase();
  if (!TIERS.has(tier)) throw new CliError(`Unsupported tier: ${tier}.`);
  if (!DIVISIONS.has(division)) throw new CliError(`Unsupported division: ${division}.`);

  return Object.freeze({
    mode,
    help: Boolean(raw.help),
    platform,
    region,
    tier,
    division,
    page: parseInteger(raw.page ?? DEFAULT_OPTIONS.page, 'page', 1, 100),
    players: parseInteger(raw.players ?? DEFAULT_OPTIONS.players, 'players', 1, 5),
    matches: parseInteger(raw.matches ?? DEFAULT_OPTIONS.matches, 'matches', 1, 20),
    write: Boolean(raw.write),
    minDelayMs: parseInteger(
      raw['min-delay-ms'] ?? DEFAULT_OPTIONS.minDelayMs,
      'min-delay-ms',
      1_250,
      60_000,
    ),
    maxRetries: parseInteger(
      raw['max-retries'] ?? DEFAULT_OPTIONS.maxRetries,
      'max-retries',
      0,
      5,
    ),
    userAgent: validateUserAgent(raw['user-agent'] ?? DEFAULT_OPTIONS.userAgent),
  });
}

export function buildLeagueEntriesUrl(options) {
  const url = new URL(
    `/tft/league/v1/entries/${encodeURIComponent(options.tier)}/${encodeURIComponent(options.division)}`,
    `https://${options.platform}.api.riotgames.com`,
  );
  url.searchParams.set('page', String(options.page));
  return url;
}

export function buildMatchIdsUrl(options, puuid) {
  const url = new URL(
    `/tft/match/v1/matches/by-puuid/${encodeURIComponent(puuid)}/ids`,
    `https://${options.region}.api.riotgames.com`,
  );
  url.searchParams.set('start', '0');
  url.searchParams.set('count', String(options.matches));
  return url;
}

export function buildMatchUrl(options, matchId) {
  return new URL(
    `/tft/match/v1/matches/${encodeURIComponent(matchId)}`,
    `https://${options.region}.api.riotgames.com`,
  );
}

function assertOfficialRiotUrl(url) {
  if (!(url instanceof URL) || url.protocol !== 'https:') {
    throw new RiotApiError('Refusing a non-HTTPS Riot API request.');
  }
  const leagueRequest = url.pathname.startsWith('/tft/league/v1/');
  const matchRequest = url.pathname.startsWith('/tft/match/v1/');
  const hostAllowed = leagueRequest
    ? PLATFORM_HOSTS.has(url.hostname)
    : matchRequest
      ? REGIONAL_HOSTS.has(url.hostname)
      : false;
  if (!hostAllowed || /(^|\.)cn(?:\.|$)/i.test(url.hostname)) {
    throw new RiotApiError('Refusing an unsupported Riot API host.');
  }
  if (!leagueRequest && !matchRequest) {
    throw new RiotApiError('Refusing an API outside tft-league-v1 and tft-match-v1.');
  }
}

export function parseRetryAfterMs(value, nowMs = Date.now()) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const normalized = String(value).trim();
  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return Math.max(0, Math.ceil(Number(normalized) * 1_000));
  }
  const retryAt = Date.parse(normalized);
  if (Number.isNaN(retryAt)) return null;
  return Math.max(0, retryAt - nowMs);
}

function parseRateHeader(value) {
  if (!value) return new Map();
  const result = new Map();
  for (const pair of value.split(',')) {
    const match = pair.trim().match(/^(\d+):(\d+)$/);
    if (!match) continue;
    result.set(Number(match[2]), Number(match[1]));
  }
  return result;
}

export function exhaustedRateLimitDelayMs(headers) {
  let waitMs = 0;
  for (const prefix of ['X-App-Rate-Limit', 'X-Method-Rate-Limit']) {
    const limits = parseRateHeader(headers.get(prefix));
    const counts = parseRateHeader(headers.get(`${prefix}-Count`));
    for (const [windowSeconds, limit] of limits) {
      const count = counts.get(windowSeconds);
      if (count !== undefined && count >= limit) {
        waitMs = Math.max(waitMs, windowSeconds * 1_000);
      }
    }
  }
  return waitMs;
}

export function createRiotApiClient({
  apiKey,
  userAgent,
  minDelayMs = DEFAULT_OPTIONS.minDelayMs,
  maxRetries = DEFAULT_OPTIONS.maxRetries,
  requestTimeoutMs = 15_000,
  fetchImpl = globalThis.fetch,
  sleepFn = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  nowFn = Date.now,
}) {
  requireNonEmptyString(apiKey, 'RIOT_API_KEY');
  if (
    apiKey.length > 512 ||
    apiKey.trim() !== apiKey ||
    /[\u0000-\u001f\u007f]/.test(apiKey)
  ) {
    throw new Error('RIOT_API_KEY has an invalid format.');
  }
  validateUserAgent(userAgent);
  if (!Number.isInteger(minDelayMs) || minDelayMs < 1_250 || minDelayMs > 60_000) {
    throw new Error('minDelayMs must be an integer between 1250 and 60000.');
  }
  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 5) {
    throw new Error('maxRetries must be an integer between 0 and 5.');
  }
  if (
    !Number.isInteger(requestTimeoutMs) ||
    requestTimeoutMs < 1_000 ||
    requestTimeoutMs > 120_000
  ) {
    throw new Error('requestTimeoutMs must be an integer between 1000 and 120000.');
  }
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');

  let lastRequestAt = null;
  let cooldownUntil = 0;

  async function waitBeforeRequest() {
    const now = nowFn();
    const throttleUntil = lastRequestAt === null ? 0 : lastRequestAt + minDelayMs;
    const waitMs = Math.max(0, cooldownUntil - now, throttleUntil - now);
    if (waitMs > 0) await sleepFn(waitMs);
  }

  return Object.freeze({
    async requestJson(url, label) {
      assertOfficialRiotUrl(url);

      for (let attempt = 0; ; attempt += 1) {
        await waitBeforeRequest();
        lastRequestAt = nowFn();

        let response;
        try {
          response = await fetchImpl(url, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'User-Agent': userAgent,
              'X-Riot-Token': apiKey,
            },
            redirect: 'error',
            signal: AbortSignal.timeout(requestTimeoutMs),
          });
        } catch {
          if (attempt < maxRetries) {
            cooldownUntil = Math.max(cooldownUntil, nowFn() + minDelayMs * 2 ** attempt);
            continue;
          }
          throw new RiotApiError(`Riot API ${label} request failed before receiving a response.`);
        }

        if (response.ok) {
          const rateWaitMs = exhaustedRateLimitDelayMs(response.headers);
          if (rateWaitMs > 0) {
            cooldownUntil = Math.max(cooldownUntil, nowFn() + rateWaitMs);
          }
          try {
            return await response.json();
          } catch {
            throw new RiotApiError(`Riot API ${label} returned invalid JSON.`);
          }
        }

        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < maxRetries) {
          const retryAfterMs = parseRetryAfterMs(response.headers.get('Retry-After'), nowFn());
          const fallbackMs = minDelayMs * 2 ** attempt;
          cooldownUntil = Math.max(cooldownUntil, nowFn() + (retryAfterMs ?? fallbackMs));
          continue;
        }

        throw new RiotApiError(`Riot API ${label} request failed with HTTP ${response.status}.`);
      }
    },
  });
}

function validateLeagueEntries(value) {
  if (!Array.isArray(value)) throw new RiotApiError('League entries response must be an array.');
  for (const [index, entry] of value.entries()) {
    if (!isPlainObject(entry)) throw new RiotApiError(`League entry ${index} must be an object.`);
    try {
      requireNonEmptyString(entry.puuid, `league entry ${index}.puuid`);
    } catch (error) {
      throw new RiotApiError(error.message);
    }
  }
  return value;
}

function validateMatchIds(value) {
  if (!Array.isArray(value)) throw new RiotApiError('Match ID response must be an array.');
  for (const [index, matchId] of value.entries()) {
    try {
      requireNonEmptyString(matchId, `match ID ${index}`);
    } catch (error) {
      throw new RiotApiError(error.message);
    }
  }
  return value;
}

function validateMatch(value, expectedMatchId) {
  if (!isPlainObject(value) || !isPlainObject(value.metadata) || !isPlainObject(value.info)) {
    throw new RiotApiError('A match response is missing metadata or info.');
  }
  if (value.metadata.match_id !== expectedMatchId) {
    throw new RiotApiError('A match response returned a mismatched metadata.match_id.');
  }
  if (!Array.isArray(value.metadata.participants) || !Array.isArray(value.info.participants)) {
    throw new RiotApiError('A match response has invalid participant lists.');
  }
  for (const [index, participant] of value.info.participants.entries()) {
    if (!isPlainObject(participant) || typeof participant.puuid !== 'string') {
      throw new RiotApiError(`A match response participant ${index} is invalid.`);
    }
    if (!Number.isInteger(participant.placement) || participant.placement < 1) {
      throw new RiotApiError(`A match response participant ${index} has invalid placement.`);
    }
  }
  return value;
}

function choosePuuids(entries, count) {
  return [...new Set(entries.map((entry) => entry.puuid))]
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    .slice(0, count);
}

export function buildDryRunPlan(options) {
  return Object.freeze({
    mode: 'dry-run',
    networkRequests: 0,
    writes: 0,
    apiFamilies: ['tft-league-v1', 'tft-match-v1'],
    platform: options.platform,
    region: options.region,
    leagueRequest: buildLeagueEntriesUrl(options).toString(),
    matchIdRequestTemplate: `https://${options.region}.api.riotgames.com/tft/match/v1/matches/by-puuid/{puuid}/ids?start=0&count=${options.matches}`,
    matchRequestTemplate: `https://${options.region}.api.riotgames.com/tft/match/v1/matches/{matchId}`,
    privateOutputs: {
      rawSnapshot: PRIVATE_SNAPSHOT_OUTPUT,
      anonymizedAggregate: PRIVATE_AGGREGATE_OUTPUT,
    },
  });
}

export async function collectSnapshot(options, { requestJson, capturedAt }) {
  if (typeof requestJson !== 'function') throw new Error('requestJson is required.');
  if (typeof capturedAt !== 'string' || Number.isNaN(Date.parse(capturedAt))) {
    throw new Error('capturedAt must be an ISO-compatible date string.');
  }

  const leagueUrl = buildLeagueEntriesUrl(options);
  const leagueEntries = validateLeagueEntries(
    await requestJson(leagueUrl, 'tft-league-v1 league entries'),
  );
  const selectedPuuids = choosePuuids(leagueEntries, options.players);

  const playerMatches = [];
  for (const puuid of selectedPuuids) {
    const matchIdsUrl = buildMatchIdsUrl(options, puuid);
    const matchIds = validateMatchIds(
      await requestJson(matchIdsUrl, 'tft-match-v1 match IDs'),
    ).slice(0, options.matches);
    const matches = [];
    for (const matchId of matchIds) {
      const match = await requestJson(buildMatchUrl(options, matchId), 'tft-match-v1 match');
      matches.push(validateMatch(match, matchId));
    }
    playerMatches.push({ puuid, matchIds, matches });
  }

  return {
    schemaVersion: 1,
    capturedAt,
    source: {
      provider: 'Riot Games API',
      mode: options.mode,
      apiFamilies: ['tft-league-v1', 'tft-match-v1'],
      platform: options.platform,
      region: options.region,
    },
    query: {
      tier: options.tier,
      division: options.division,
      page: options.page,
      requestedPlayers: options.players,
      requestedMatchesPerPlayer: options.matches,
    },
    leagueEntries,
    playerMatches,
  };
}

export async function loadFixture(fixturePath) {
  let fixture;
  try {
    fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
  } catch {
    throw new FixtureError('Unable to read the offline fixture.');
  }

  if (
    !isPlainObject(fixture) ||
    !isPlainObject(fixture.fixture) ||
    !isPlainObject(fixture.fixture.query) ||
    typeof fixture.fixture.capturedAt !== 'string' ||
    Number.isNaN(Date.parse(fixture.fixture.capturedAt)) ||
    !Array.isArray(fixture.leagueEntries) ||
    !isPlainObject(fixture.matchIdsByPuuid) ||
    !isPlainObject(fixture.matchesById)
  ) {
    throw new FixtureError('Offline fixture structure is invalid.');
  }
  return fixture;
}

export function createFixtureClient(fixture) {
  return Object.freeze({
    async requestJson(url) {
      if (url.pathname.startsWith('/tft/league/v1/entries/')) {
        const [, , , , , tier, division] = url.pathname.split('/');
        const expected = fixture.fixture.query;
        if (
          url.hostname !== `${expected.platform}.api.riotgames.com` ||
          tier !== expected.tier ||
          division !== expected.division ||
          url.searchParams.get('page') !== String(expected.page)
        ) {
          throw new FixtureError('Offline fixture only supports its declared league query.');
        }
        return structuredClone(fixture.leagueEntries);
      }

      const matchIds = url.pathname.match(/^\/tft\/match\/v1\/matches\/by-puuid\/([^/]+)\/ids$/);
      if (matchIds) {
        if (url.hostname !== `${fixture.fixture.query.region}.api.riotgames.com`) {
          throw new FixtureError('Offline fixture only supports its declared regional route.');
        }
        const puuid = decodeURIComponent(matchIds[1]);
        if (!hasOwn(fixture.matchIdsByPuuid, puuid)) {
          throw new FixtureError(`Offline fixture has no match IDs for ${puuid}.`);
        }
        return structuredClone(fixture.matchIdsByPuuid[puuid]);
      }

      const match = url.pathname.match(/^\/tft\/match\/v1\/matches\/([^/]+)$/);
      if (match) {
        if (url.hostname !== `${fixture.fixture.query.region}.api.riotgames.com`) {
          throw new FixtureError('Offline fixture only supports its declared regional route.');
        }
        const matchId = decodeURIComponent(match[1]);
        if (!hasOwn(fixture.matchesById, matchId)) {
          throw new FixtureError(`Offline fixture has no match payload for ${matchId}.`);
        }
        return structuredClone(fixture.matchesById[matchId]);
      }

      throw new FixtureError(`Offline fixture does not support ${url.pathname}.`);
    },
  });
}

export function snapshotSummary(snapshot) {
  const matchIds = snapshot.playerMatches.reduce((total, player) => total + player.matchIds.length, 0);
  const matches = snapshot.playerMatches.reduce((total, player) => total + player.matches.length, 0);
  return {
    mode: snapshot.source.mode,
    apiFamilies: snapshot.source.apiFamilies,
    platform: snapshot.source.platform,
    region: snapshot.source.region,
    leagueEntries: snapshot.leagueEntries.length,
    selectedPlayers: snapshot.playerMatches.length,
    matchIds,
    matchDetails: matches,
  };
}

function roundMetric(value) {
  return Number(value.toFixed(4));
}

function placementMetrics(placements) {
  if (placements.length === 0) {
    return {
      averagePlacement: null,
      topFourRate: null,
      firstPlaceRate: null,
    };
  }
  return {
    averagePlacement: roundMetric(
      placements.reduce((total, placement) => total + placement, 0) / placements.length,
    ),
    topFourRate: roundMetric(
      placements.filter((placement) => placement <= 4).length / placements.length,
    ),
    firstPlaceRate: roundMetric(
      placements.filter((placement) => placement === 1).length / placements.length,
    ),
  };
}

function summarizeDimension(observations, key, outputKey) {
  const counts = new Map();
  for (const observation of observations) {
    const value = observation[key];
    if (value === undefined || value === null || value === '') continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => {
      if (typeof left === 'number' && typeof right === 'number') return left - right;
      return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
    })
    .map(([value, sampleCount]) => ({ [outputKey]: value, sampleCount }));
}

function normalizeUnits(participant) {
  if (participant.units === undefined || participant.units === null) return [];
  if (!Array.isArray(participant.units)) {
    throw new RiotApiError('A selected player has an invalid units list.');
  }
  return participant.units
    .map((unit, index) => {
      if (!isPlainObject(unit) || typeof unit.character_id !== 'string' || unit.character_id === '') {
        throw new RiotApiError(`A selected player unit ${index} has invalid character_id.`);
      }
      const tier = unit.tier === undefined || unit.tier === null ? null : unit.tier;
      if (tier !== null && (!Number.isInteger(tier) || tier < 1)) {
        throw new RiotApiError(`A selected player unit ${index} has invalid tier.`);
      }
      if (unit.itemNames !== undefined && unit.itemNames !== null && !Array.isArray(unit.itemNames)) {
        throw new RiotApiError(`A selected player unit ${index} has invalid itemNames.`);
      }
      const itemNames = (unit.itemNames ?? []).map((itemName, itemIndex) => {
        if (typeof itemName !== 'string' || itemName === '') {
          throw new RiotApiError(
            `A selected player unit ${index} itemNames[${itemIndex}] is invalid.`,
          );
        }
        return itemName;
      });
      itemNames.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
      return { characterId: unit.character_id, tier, itemNames };
    })
    .sort((left, right) =>
      left.characterId < right.characterId ? -1 : left.characterId > right.characterId ? 1 : 0,
    );
}

function collectAggregateObservations(snapshot) {
  const observations = [];
  for (const player of snapshot.playerMatches) {
    for (const match of player.matches) {
      const participant = match.info.participants.find((candidate) => candidate.puuid === player.puuid);
      if (!participant) {
        throw new RiotApiError('A match response does not contain the selected player.');
      }
      observations.push({
        placement: participant.placement,
        gameVersion:
          typeof match.info.game_version === 'string' && match.info.game_version !== ''
            ? match.info.game_version
            : null,
        tftSetNumber:
          Number.isFinite(match.info.tft_set_number) ? match.info.tft_set_number : null,
        queueId: Number.isFinite(match.info.queue_id) ? match.info.queue_id : null,
        units: normalizeUnits(participant),
      });
    }
  }
  return observations;
}

function compositionSummaries(observations) {
  const groups = new Map();
  for (const observation of observations) {
    const characterIds = observation.units.map((unit) => unit.characterId);
    const fingerprint = `sha256:${crypto
      .createHash('sha256')
      .update(JSON.stringify(characterIds))
      .digest('hex')}`;
    const groupKey = JSON.stringify([
      observation.gameVersion,
      observation.tftSetNumber,
      observation.queueId,
      fingerprint,
    ]);
    let group = groups.get(groupKey);
    if (!group) {
      group = {
        fingerprint,
        unitCharacterIds: characterIds,
        gameVersion: observation.gameVersion,
        tftSetNumber: observation.tftSetNumber,
        queueId: observation.queueId,
        placements: [],
        units: new Map(),
      };
      groups.set(groupKey, group);
    }
    group.placements.push(observation.placement);

    for (const unit of observation.units) {
      let unitSummary = group.units.get(unit.characterId);
      if (!unitSummary) {
        unitSummary = { appearances: 0, tiers: new Map(), itemNames: new Map() };
        group.units.set(unit.characterId, unitSummary);
      }
      unitSummary.appearances += 1;
      if (unit.tier !== null) {
        unitSummary.tiers.set(unit.tier, (unitSummary.tiers.get(unit.tier) ?? 0) + 1);
      }
      for (const itemName of unit.itemNames) {
        unitSummary.itemNames.set(
          itemName,
          (unitSummary.itemNames.get(itemName) ?? 0) + 1,
        );
      }
    }
  }

  return [...groups.values()]
    .sort((left, right) => {
      const leftKey = JSON.stringify([
        left.gameVersion,
        left.tftSetNumber,
        left.queueId,
        left.fingerprint,
      ]);
      const rightKey = JSON.stringify([
        right.gameVersion,
        right.tftSetNumber,
        right.queueId,
        right.fingerprint,
      ]);
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    })
    .map((group) => ({
      fingerprint: group.fingerprint,
      unitCharacterIds: [...group.unitCharacterIds],
      ...(group.gameVersion === null ? {} : { gameVersion: group.gameVersion }),
      ...(group.tftSetNumber === null ? {} : { tftSetNumber: group.tftSetNumber }),
      ...(group.queueId === null ? {} : { queueId: group.queueId }),
      sampleCount: group.placements.length,
      metrics: placementMetrics(group.placements),
      units: [...group.units.entries()]
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([characterId, unit]) => ({
          characterId,
          appearances: unit.appearances,
          tiers: [...unit.tiers.entries()]
            .sort(([left], [right]) => left - right)
            .map(([tier, appearances]) => ({ tier, appearances })),
          itemNames: [...unit.itemNames.entries()]
            .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
            .map(([itemName, appearances]) => ({ itemName, appearances })),
        })),
    }));
}

function rawIdentifierStrings(snapshot) {
  const identifiers = new Set();
  const add = (value) => {
    if (typeof value === 'string' && value !== '') identifiers.add(value);
  };

  for (const entry of snapshot.leagueEntries) {
    for (const key of [
      'puuid',
      'summonerId',
      'summonerName',
      'accountId',
      'playerId',
      'riotId',
      'riotIdGameName',
      'gameName',
    ]) {
      add(entry[key]);
    }
  }
  for (const player of snapshot.playerMatches) {
    add(player.puuid);
    for (const matchId of player.matchIds) add(matchId);
    for (const match of player.matches) {
      add(match.metadata.match_id);
      for (const participantId of match.metadata.participants) add(participantId);
      for (const participant of match.info.participants) {
        for (const key of [
          'puuid',
          'summonerId',
          'summonerName',
          'accountId',
          'playerId',
          'riotId',
          'riotIdGameName',
          'gameName',
        ]) {
          add(participant[key]);
        }
        const riotIdGameName = participant.riotIdGameName ?? participant.gameName;
        const riotIdTagline = participant.riotIdTagline ?? participant.tagLine;
        if (typeof riotIdGameName === 'string' && typeof riotIdTagline === 'string') {
          add(`${riotIdGameName}#${riotIdTagline}`);
        }
      }
    }
  }
  return identifiers;
}

function assertAggregateIsAnonymous(aggregate, snapshot) {
  const forbiddenKey = /^(?:puuid|match_?ids?|summoner(?:id|name)|riotid.*|participants?|account_?id|player_?id)$/i;
  const identifiers = rawIdentifierStrings(snapshot);

  function visit(value) {
    if (typeof value === 'string') {
      for (const identifier of identifiers) {
        if (value.includes(identifier)) {
          throw new RiotApiError('An anonymized aggregate contained a raw identifier.');
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const child of value) visit(child);
      return;
    }
    if (!isPlainObject(value)) return;
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenKey.test(key)) {
        throw new RiotApiError('An anonymized aggregate contained a forbidden identifier field.');
      }
      visit(child);
    }
  }

  visit(aggregate);
}

export function buildAnonymizedAggregate(snapshot) {
  const observations = collectAggregateObservations(snapshot);
  const placements = observations.map((observation) => observation.placement);
  const aggregate = {
    schemaVersion: 1,
    aggregateType: 'anonymized-private-tft-summary',
    capturedAt: snapshot.capturedAt,
    source: {
      provider: snapshot.source.provider,
      mode: snapshot.source.mode,
      apiFamilies: [...snapshot.source.apiFamilies],
      platform: snapshot.source.platform,
      region: snapshot.source.region,
    },
    query: {
      tier: snapshot.query.tier,
      division: snapshot.query.division,
      page: snapshot.query.page,
    },
    sampleCount: observations.length,
    metrics: placementMetrics(placements),
    contexts: {
      gameVersions: summarizeDimension(observations, 'gameVersion', 'gameVersion'),
      tftSets: summarizeDimension(observations, 'tftSetNumber', 'tftSetNumber'),
      queues: summarizeDimension(observations, 'queueId', 'queueId'),
    },
    compositions: compositionSummaries(observations),
  };
  assertAggregateIsAnonymous(aggregate, snapshot);
  return aggregate;
}

async function writePrivateJson(projectRoot, relativeOutput, value) {
  const privateRoot = path.resolve(projectRoot, '.private-data');
  const outputPath = path.resolve(projectRoot, relativeOutput);
  if (!outputPath.startsWith(`${privateRoot}${path.sep}`)) {
    throw new Error('Private output path escaped .private-data.');
  }

  const resolvedProjectRoot = await fs.realpath(projectRoot);
  const expectedPrivateRoot = path.join(resolvedProjectRoot, '.private-data');
  await fs.mkdir(privateRoot, { recursive: true, mode: 0o700 });
  const resolvedPrivateRoot = await fs.realpath(privateRoot);
  if (resolvedPrivateRoot !== expectedPrivateRoot) {
    throw new Error('Refusing to write through a symlinked .private-data directory.');
  }

  const outputDirectory = path.dirname(outputPath);
  await fs.mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  const resolvedOutputDirectory = await fs.realpath(outputDirectory);
  if (!resolvedOutputDirectory.startsWith(`${resolvedPrivateRoot}${path.sep}`)) {
    throw new Error('Refusing to write through a private output directory symlink.');
  }

  await fs.chmod(privateRoot, 0o700);
  await fs.chmod(outputDirectory, 0o700);
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    await fs.rename(temporaryPath, outputPath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
  await fs.chmod(outputPath, 0o600);
  return outputPath;
}

export async function writePrivateSnapshot(projectRoot, snapshot) {
  return writePrivateJson(projectRoot, PRIVATE_SNAPSHOT_OUTPUT, snapshot);
}

export async function writePrivateAggregate(projectRoot, aggregate) {
  return writePrivateJson(projectRoot, PRIVATE_AGGREGATE_OUTPUT, aggregate);
}
