#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CliError,
  PRIVATE_AGGREGATE_OUTPUT,
  PRIVATE_SNAPSHOT_OUTPUT,
  buildAnonymizedAggregate,
  buildDryRunPlan,
  collectSnapshot,
  createFixtureClient,
  createRiotApiClient,
  loadFixture,
  parseCliArgs,
  snapshotSummary,
  writePrivateAggregate,
  writePrivateSnapshot,
} from './lib.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../..');
const fixturePath = path.join(scriptDirectory, 'fixtures/offline-snapshot.json');

const HELP = `
弈路助手 Riot TFT API 手动本地工具

用法：
  node scripts/riot-tft-manual/cli.mjs [options]

模式（默认 dry-run）：
  --live                 显式访问 Riot API，仅从 RIOT_API_KEY 读取密钥
  --offline              使用仓库内的确定性测试夹具，不联网
  --write                将原始快照和匿名聚合写入 .private-data/riot-tft/

查询：
  --platform <na1>       平台路由（默认 na1）
  --region <americas>    区域路由（默认 americas）
  --tier <GOLD>          段位（IRON 至 DIAMOND，默认 GOLD）
  --division <I>         分区 I / II / III / IV（默认 I）
  --page <1>             榜单页码 1-100（默认 1）
  --players <1>          确定性选取玩家数 1-5（默认 1）
  --matches <1>          每位玩家最近对局数 1-20（默认 1）

请求控制：
  --min-delay-ms <1250>  两次请求的最小间隔，不得低于 1250ms
  --max-retries <3>      429 / 5xx / 网络错误的最大重试次数 0-5
  --user-agent <value>   覆盖项目识别 User-Agent
  --help                 显示说明
`.trim();

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${HELP}\n`);
    return;
  }

  if (options.mode === 'dry-run') {
    printJson(buildDryRunPlan(options));
    return;
  }

  let client;
  let capturedAt;
  if (options.mode === 'offline') {
    const fixture = await loadFixture(fixturePath);
    client = createFixtureClient(fixture);
    capturedAt = fixture.fixture.capturedAt;
  } else {
    const apiKey = process.env.RIOT_API_KEY;
    if (typeof apiKey !== 'string' || apiKey.trim() === '') {
      throw new CliError('--live requires RIOT_API_KEY in the current process environment.');
    }
    client = createRiotApiClient({
      apiKey,
      userAgent: options.userAgent,
      minDelayMs: options.minDelayMs,
      maxRetries: options.maxRetries,
    });
    capturedAt = new Date().toISOString();
  }

  const snapshot = await collectSnapshot(options, {
    requestJson: client.requestJson,
    capturedAt,
  });
  const aggregate = buildAnonymizedAggregate(snapshot);
  const summary = snapshotSummary(snapshot);
  summary.aggregate = {
    sampleCount: aggregate.sampleCount,
    metrics: aggregate.metrics,
    compositionCount: aggregate.compositions.length,
  };
  if (options.write) {
    await writePrivateSnapshot(projectRoot, snapshot);
    await writePrivateAggregate(projectRoot, aggregate);
    summary.privateOutputs = {
      rawSnapshot: PRIVATE_SNAPSHOT_OUTPUT,
      anonymizedAggregate: PRIVATE_AGGREGATE_OUTPUT,
    };
  }
  printJson(summary);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error.';
  process.stderr.write(`Riot TFT manual tool failed: ${message}\n`);
  process.exitCode = 1;
});
