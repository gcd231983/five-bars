#!/usr/bin/env node
// GitHub Actions only: convert precomputed, narrowly scoped alert feed to
// individual owner-assigned GitHub Issues using the ephemeral GitHub token.
// Never scans carrier sites, changes prices, closes/reopens issues or pings on
// every unchanged daily run.
import {readFile} from 'node:fs/promises';
import {syncIssueAlerts} from './issue-alerts.mjs';

const feed=JSON.parse(await readFile(new URL('../site/data/alerts.json',import.meta.url),'utf8'));
const result=await syncIssueAlerts(feed,{
  repository:process.env.GITHUB_REPOSITORY,
  owner:process.env.GITHUB_REPOSITORY_OWNER,
  token:process.env.GITHUB_TOKEN,
  dryRun:process.argv.includes('--dry-run'),
  logger:message=>console.log(message),
});
console.log(JSON.stringify(result,null,2));
