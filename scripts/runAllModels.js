/*
 * Script: runAllModels.js
 * Description: Runs generateBrigadeCampaignJSON.js for multiple LLMs for a given
 *   brigade page URL, then prints a coordinate-coverage analysis report.
 *
 * Usage:
 *   node scripts/runAllModels.js --website <URL>
 *   node scripts/runAllModels.js -w <URL> --models gpt-4o,claude-sonnet-4-6
 *   node scripts/runAllModels.js -w <URL> --output-dir ./my_output
 *   node scripts/runAllModels.js -w <URL> --dry-run   (print plan, skip API calls)
 *
 * Author: PeraZver
 */

require('dotenv').config();

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// ─── Default model list ───────────────────────────────────────────────────────

const DEFAULT_MODELS = [
  { model: 'gpt-4o',            provider: 'openai'    },
  { model: 'gpt-4.1',           provider: 'openai'    },
  { model: 'gpt-5.1',           provider: 'openai'    },
  { model: 'gpt-5.2',           provider: 'openai'    },
  { model: 'claude-sonnet-4-5', provider: 'anthropic' },
  { model: 'claude-sonnet-4-6', provider: 'anthropic' },
  { model: 'claude-opus-4-6',   provider: 'anthropic' },
];

const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, '../public/assets/brigades/model_test');
const GENERATOR_SCRIPT   = path.resolve(__dirname, 'generateBrigadeCampaignJSON.js');

// ─── CLI ──────────────────────────────────────────────────────────────────────

const argv = yargs(hideBin(process.argv))
  .option('website', {
    alias: 'w',
    type: 'string',
    demandOption: true,
    description: 'Brigade page URL (e.g. https://znaci.org/odrednica.php?slug=...)'
  })
  .option('models', {
    alias: 'm',
    type: 'string',
    description: 'Comma-separated model IDs to run (overrides defaults). ' +
                 'Use prefix "anthropic:" or "openai:" to force provider, ' +
                 'e.g. "gpt-4o,claude-sonnet-4-6,anthropic:claude-3-7-sonnet-latest"'
  })
  .option('output-dir', {
    alias: 'o',
    type: 'string',
    default: DEFAULT_OUTPUT_DIR,
    description: 'Directory where generated JSON files will be saved'
  })
  .option('dry-run', {
    alias: 'd',
    type: 'boolean',
    default: false,
    description: 'Print the run plan without making any API calls'
  })
  .option('skip-existing', {
    alias: 's',
    type: 'boolean',
    default: false,
    description: 'Skip a model if its output JSON already exists'
  })
  .help()
  .argv;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Infer provider from model string, supporting prefix form "anthropic:model".
 */
function parseModelSpec(spec) {
  const trimmed = spec.trim();
  const prefixMatch = trimmed.match(/^(openai|anthropic)[/:](.+)$/i);
  if (prefixMatch) {
    return { model: prefixMatch[2].trim(), provider: prefixMatch[1].toLowerCase() };
  }
  const provider = /^claude/i.test(trimmed) ? 'anthropic' : 'openai';
  return { model: trimmed, provider };
}

/**
 * Find the output JSON file for a given model in the output dir.
 * Files are named:  <brigade_slug>_<model>.json
 */
function findOutputFile(dir, modelId) {
  if (!fs.existsSync(dir)) return null;
  const safeModel = modelId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern   = new RegExp(`^(.+)_${safeModel}\\.json$`, 'i');
  for (const file of fs.readdirSync(dir)) {
    const m = file.match(pattern);
    if (m) return path.join(dir, file);
  }
  return null;
}

/**
 * Returns true if coordinates are genuinely placed (finite lat & lng).
 */
function isPlaced(coords) {
  return (
    coords != null &&
    typeof coords.lat === 'number' && isFinite(coords.lat) &&
    typeof coords.lng === 'number' && isFinite(coords.lng)
  );
}

// ─── Runner ───────────────────────────────────────────────────────────────────

function runModel(model, provider, website, outputDir, dryRun) {
  const bar = '─'.repeat(60);
  console.log(`\n${bar}`);
  console.log(`▶  ${model}  (${provider})`);
  console.log(bar);

  if (dryRun) {
    console.log(`   [dry-run] Would call: node generateBrigadeCampaignJSON.js \\`);
    console.log(`     --website "${website}" --model ${model} --provider ${provider}`);
    return true;
  }

  // Note: generateBrigadeCampaignJSON.js hardcodes its output to
  // public/assets/brigades/model_test/ — outputDir is used for analysis only.
  const result = spawnSync(
    process.execPath,
    [GENERATOR_SCRIPT,
     '--website', website,
     '--model',   model,
     '--provider', provider
    ],
    { stdio: 'inherit', env: process.env }
  );

  if (result.error) {
    console.error(`✗  Error launching process: ${result.error.message}`);
    return false;
  }
  if (result.status !== 0) {
    console.error(`✗  Exited with code ${result.status}`);
    return false;
  }
  console.log(`✓  ${model} completed.`);
  return true;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

function analyzeResults(modelList, outputDir) {
  const border = '═'.repeat(70);
  console.log(`\n${border}`);
  console.log('  COORDINATE COVERAGE ANALYSIS');
  console.log(border);

  const results = [];

  for (const { model } of modelList) {
    const filePath = findOutputFile(outputDir, model);
    if (!filePath) {
      console.warn(`  [!] No output file found for: ${model} — skipping`);
      continue;
    }

    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.warn(`  [!] Could not parse ${path.basename(filePath)}: ${e.message}`);
      continue;
    }

    const movements  = Array.isArray(data.movements) ? data.movements : [];
    const placed     = movements.filter(m => isPlaced(m.coordinates));
    const unplaced   = movements.filter(m => !isPlaced(m.coordinates));

    results.push({
      model,
      entries:       movements.length,
      placed:        placed.length,
      unplaced:      unplaced.length,
      unplacedItems: unplaced
    });
  }

  if (results.length === 0) {
    console.log('\n  No results to analyse.\n');
    return;
  }

  // Sort best → worst
  results.sort((a, b) => a.unplaced - b.unplaced);

  // ── Summary table ───────────────────────────────────────────────────────
  const W = [26, 10, 10, 10];
  const hdr = ['Model', 'Entries', 'Placed', 'Unplaced'];
  const sep = W.map(w => '─'.repeat(w)).join('┼');

  console.log('\n  ┌─ Summary ' + '─'.repeat(50));
  console.log('  ' + hdr.map((h, i) => h.padEnd(W[i])).join(' │ '));
  console.log('  ' + sep);
  for (const r of results) {
    const mark = r.unplaced === 0 ? '✓' : r.unplaced <= 4 ? '△' : '✗';
    const row  = [r.model, String(r.entries), String(r.placed), `${r.unplaced} ${mark}`];
    console.log('  ' + row.map((v, i) => v.padEnd(W[i])).join(' │ '));
  }

  // ── Per-model unplaced breakdown ────────────────────────────────────────
  console.log('\n  ┌─ Per-model unplaced entries ' + '─'.repeat(33));
  for (const r of results) {
    if (r.unplaced === 0) {
      console.log(`\n  ✓  ${r.model}: all entries placed`);
      continue;
    }
    console.log(`\n  ${r.model}  —  ${r.unplaced} unplaced of ${r.entries}:`);
    for (const item of r.unplacedItems) {
      const op = (item.operation || '').substring(0, 58);
      console.log(`      ${(item.date || 'unknown').padEnd(12)}  ${op}`);
    }
  }

  // ── Universal unplaceables (all models agree) ───────────────────────────
  if (results.length > 1) {
    const allSets = results.map(
      r => new Set(r.unplacedItems.map(i => `${i.date}|${i.operation}`))
    );
    const universal = results[0].unplacedItems.filter(item => {
      const key = `${item.date}|${item.operation}`;
      return allSets.every(s => s.has(key));
    });
    if (universal.length > 0) {
      console.log(`\n  ★  Universally unplaceable — all ${results.length} models agree:`);
      for (const item of universal) {
        console.log(`      ${(item.date || '').padEnd(12)}  ${item.operation || ''}`);
      }
    }
  }

  console.log(`\n${border}\n`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const outputDir = path.resolve(argv['output-dir']);
  const website   = argv.website;
  const dryRun    = argv['dry-run'];
  const skipExisting = argv['skip-existing'];

  // Build model list
  let modelList = DEFAULT_MODELS;
  if (argv.models) {
    modelList = argv.models.split(',').map(s => parseModelSpec(s));
  }

  console.log(`\n${'━'.repeat(70)}`);
  console.log(`  runAllModels.js`);
  console.log(`  URL:     ${website}`);
  console.log(`  Models:  ${modelList.map(m => m.model).join(', ')}`);
  console.log(`  Output:  ${outputDir}`);
  if (dryRun)       console.log('  Mode:    DRY RUN (no API calls)');
  if (skipExisting) console.log('  Skipping models with existing output files');
  console.log('━'.repeat(70));

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`  Created output directory: ${outputDir}`);
  }

  const runResults = [];
  for (const { model, provider } of modelList) {
    if (skipExisting) {
      const existing = findOutputFile(outputDir, model);
      if (existing) {
        console.log(`\n  ↷  Skipping ${model} — file already exists: ${path.basename(existing)}`);
        runResults.push({ model, status: 'skipped' });
        continue;
      }
    }

    const ok = runModel(model, provider, website, outputDir, dryRun);
    runResults.push({ model, status: ok ? 'ok' : 'failed' });
  }

  // Summary of run
  const failed  = runResults.filter(r => r.status === 'failed');
  const skipped = runResults.filter(r => r.status === 'skipped');
  if (failed.length)  console.warn(`\n[!] ${failed.length} model(s) failed:  ${failed.map(r => r.model).join(', ')}`);
  if (skipped.length) console.log(`\n[i] ${skipped.length} model(s) skipped: ${skipped.map(r => r.model).join(', ')}`);

  if (!dryRun) {
    analyzeResults(modelList, outputDir);
  } else {
    console.log('\n[dry-run] Skipped analysis — no output files were written.\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
