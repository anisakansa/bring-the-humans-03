// A working bring-the-humans-03 entry (Node 22, standard library only): it copies VIDEO.json from the repository root
// to /output/VIDEO.json, where the gate reads it. That is all the program has to do. The entry is the video itself:
// your agent makes an original short vertical ad for make.fun, the ad is posted publicly on TikTok from a public account
// with the bounty's line and your play code in its caption (or the code in the account's bio), VIDEO.json names the
// video, and the house reads the video's views from TikTok. Nothing this program writes about the video is scored.
//
// The ad shows make.fun's brand badge (the mascot mark and the make.fun wordmark) from its first frame and ends on
// make.fun's referral end card with your own referral code in its field, both from make.fun's press pack and used as
// they are, as is every make.fun mark, wordmark or colour in it: https://make.fun/press/manifest.json lists the files
// and https://make.fun/press/llms.txt is the guide for agents. Fetch them when you make the ad; this repository holds
// no copy of them. No check reads the video for them: make.fun's admins may disqualify a video without them.
//
// The VIDEO.json this starter ships holds a placeholder address, so the gate refuses it as it stands (valid 0).
// Replace it with your video's address before you submit.
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR stand in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// --- Entry self-check (round 5) ---
// Before the gate reads VIDEO.json, the entry verifies its own
// submission files so a broken hand-in fails loudly here instead of
// being refused later: the video address must be a full tiktok.com
// video address (never a short link, never the starter placeholder),
// the README must carry the three live make.fun badges, and the
// LICENSE must be the MIT License. Every check reads only files
// inside this repository, uses no network and no clock, and prints
// the same report on every run, so the two grader runs still write
// the same bytes.
//
//   node main.ts --check-only   validate and exit, do not copy
//   node main.ts --json         print the report as JSON

type EntryCheck = { name: string; ok: boolean; detail: string };

const VIDEO_URL_PATTERN = /^https:\/\/www\.tiktok\.com\/@[A-Za-z0-9._-]+\/video\/[0-9]+$/;
const BADGE_MARKER = 'make.fun/badge/';
const REQUIRED_BADGES = 3;

function readRepoText(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

function checkVideoUrl(botDir: string): EntryCheck {
  const path = join(botDir, 'VIDEO.json');
  const text = readRepoText(path);
  if (text === null) {
    return { name: 'video_url', ok: false, detail: `VIDEO.json is missing at ${path}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { name: 'video_url', ok: false, detail: 'VIDEO.json is not valid JSON' };
  }
  if (typeof parsed !== 'object' || parsed === null || !('url' in parsed)) {
    return { name: 'video_url', ok: false, detail: 'VIDEO.json has no url field' };
  }
  const url = (parsed as { url: unknown }).url;
  if (typeof url !== 'string' || url.length === 0) {
    return { name: 'video_url', ok: false, detail: 'VIDEO.json url is empty' };
  }
  if (!VIDEO_URL_PATTERN.test(url)) {
    return { name: 'video_url', ok: false, detail: `url is not a full tiktok.com video address: ${url}` };
  }
  const parts = url.split('/');
  const handle = parts[3].slice(1);
  const videoId = parts[parts.length - 1];
  return { name: 'video_url', ok: true, detail: `video ${videoId} by @${handle}` };
}

function checkReadmeBadges(botDir: string): EntryCheck {
  const text = readRepoText(join(botDir, 'README.md'));
  if (text === null) {
    return { name: 'readme_badges', ok: false, detail: 'README.md is missing' };
  }
  const found = text.split(BADGE_MARKER).length - 1;
  if (found < REQUIRED_BADGES) {
    return { name: 'readme_badges', ok: false, detail: `found ${found} of ${REQUIRED_BADGES} live make.fun badges` };
  }
  return { name: 'readme_badges', ok: true, detail: `${found} live make.fun badges` };
}

function checkLicense(botDir: string): EntryCheck {
  const path = join(botDir, 'LICENSE');
  if (!existsSync(path)) {
    return { name: 'license', ok: false, detail: 'LICENSE is missing' };
  }
  const text = readRepoText(path);
  if (text === null || !text.includes('MIT License')) {
    return { name: 'license', ok: false, detail: 'LICENSE is not the MIT License' };
  }
  return { name: 'license', ok: true, detail: 'MIT License' };
}

function runEntryChecks(botDir: string): EntryCheck[] {
  return [checkVideoUrl(botDir), checkReadmeBadges(botDir), checkLicense(botDir)];
}

function printCheckReport(checks: EntryCheck[], asJson: boolean): void {
  if (asJson) {
    const passed = checks.filter((check) => check.ok).length;
    console.log(JSON.stringify({ ok: passed === checks.length, passed, total: checks.length, checks }, null, 2));
    return;
  }
  for (const check of checks) {
    console.log(`check ${check.name}: ${check.ok ? 'PASS' : 'FAIL'} — ${check.detail}`);
  }
}

const entryArgs = process.argv.slice(2);
const checkOnly = entryArgs.includes('--check-only');
const reportAsJson = entryArgs.includes('--json');

const entryChecks = runEntryChecks(BOT_DIR);
printCheckReport(entryChecks, reportAsJson);
if (!entryChecks.every((check) => check.ok)) {
  console.error('entry check failed: fix the files above before submitting');
  process.exit(1);
}
if (checkOnly) {
  process.exit(0);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
try {
  copyFileSync(join(BOT_DIR, 'VIDEO.json'), join(OUTPUT_DIR, 'VIDEO.json'));
  // The README promises out/VIDEO.json is byte for byte this
  // directory's VIDEO.json: verify the copy landed identical
  // instead of trusting it, and fail loudly if it did not.
  const copiedBytes = readFileSync(join(OUTPUT_DIR, 'VIDEO.json'));
  const sourceBytes = readFileSync(join(BOT_DIR, 'VIDEO.json'));
  if (!copiedBytes.equals(sourceBytes)) {
    throw new Error(`VIDEO.json copy differs from ${join(BOT_DIR, 'VIDEO.json')}`);
  }
} catch (err) {
  console.error(`VIDEO.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}
