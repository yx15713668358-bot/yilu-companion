import fs from 'node:fs/promises';
import path from 'node:path';
import {
  byteLength,
  parseArgs,
  projectRoot,
  readJson,
  sha256,
  writeJsonAtomic,
} from './common.mjs';

const args = parseArgs(process.argv.slice(2));
const selectedModes = [args.offline, args.live].filter(Boolean);
if (selectedModes.length !== 1) {
  throw new Error('Choose exactly one explicit mode: --offline for the fixture or --live for a manual network check.');
}

const outputPath = args.output || '.automation/riot-patch-check.json';
const registry = await readJson('data/source-registry.json');
const meta = await readJson('data/meta.json');
const source = registry.sources.find((entry) => entry.id === meta.officialPatchSourceId);

if (!source) throw new Error(`Missing official patch source: ${meta.officialPatchSourceId}`);
if (!source.enabled || source.automatedFetch || source.updateMode !== 'manual-on-demand' || source.adapter !== 'riot-patch-page') {
  throw new Error(`Official patch source is not configured for manual-on-demand checks: ${source.id}`);
}

function detectPatch(html) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
  const candidates = [title, html.slice(0, 250_000), source.url];
  const patterns = [
    /teamfight\s+tactics\s+patch\s+(\d{1,2}[.-]\d{1,2})/i,
    /\bpatch\s+(\d{1,2}[.-]\d{1,2})\b/i,
    /patch-(\d{1,2})-(\d{1,2})(?:\/|\b)/i,
  ];
  for (const candidate of candidates) {
    for (const pattern of patterns) {
      const match = candidate.match(pattern);
      if (!match) continue;
      return match[2] ? `${match[1]}.${match[2]}` : match[1].replace('-', '.');
    }
  }
  return null;
}

function markerMatches(html) {
  const lower = html.toLowerCase();
  return (source.requiredMarkersAny || []).filter((marker) => lower.includes(marker.toLowerCase()));
}

let report;
try {
  let html;
  let finalUrl = source.url;
  let status = 200;
  let contentType = 'text/html; charset=utf-8';
  let mode = 'manual-live';

  if (args.offline) {
    mode = 'offline-fixture';
    const fixturePath = path.resolve(projectRoot, 'scripts/automation/fixtures/riot-18.1.html');
    html = await fs.readFile(fixturePath, 'utf8');
    finalUrl = `file://${fixturePath}`;
  } else {
    const response = await fetch(source.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'Yilu-Companion-Manual-Patch-Check/1.0 (+explicit maintainer check; official patch detection only)',
      },
    });
    status = response.status;
    contentType = response.headers.get('content-type') || '';
    finalUrl = response.url;
    html = await response.text();
    if (!response.ok) throw new Error(`Riot page returned HTTP ${response.status}`);
  }

  const bodyBytes = byteLength(html);
  const detectedPatch = detectPatch(html);
  const matchedMarkers = markerMatches(html);
  const checks = {
    httpOk: status >= 200 && status < 300,
    htmlContent: contentType.toLowerCase().includes('text/html'),
    bodyLargeEnough: bodyBytes >= source.minimumBodyBytes,
    expectedMarkerPresent: matchedMarkers.length > 0,
    patchDetected: Boolean(detectedPatch),
    patchMatches: detectedPatch === source.expectedPatch && detectedPatch === meta.patch,
  };
  const ok = Object.values(checks).every(Boolean);
  report = {
    schemaVersion: 1,
    sourceId: source.id,
    checkedAt: new Date().toISOString(),
    trigger: 'explicit-cli',
    mode,
    ok,
    health: ok ? 'healthy' : 'blocked',
    expectedPatch: meta.patch,
    detectedPatch,
    httpStatus: status,
    contentType,
    finalUrl,
    bodyBytes,
    pageSha256: sha256(html),
    matchedMarkers,
    checks,
  };
} catch (error) {
  report = {
    schemaVersion: 1,
    sourceId: source.id,
    checkedAt: new Date().toISOString(),
    trigger: 'explicit-cli',
    mode: args.offline ? 'offline-fixture' : 'manual-live',
    ok: false,
    health: 'error',
    expectedPatch: meta.patch,
    detectedPatch: null,
    error: error instanceof Error ? error.message : String(error),
  };
}

const writtenPath = await writeJsonAtomic(outputPath, report);
console.log(JSON.stringify({ ...report, outputPath: writtenPath }));
if (!report.ok) process.exitCode = 1;
