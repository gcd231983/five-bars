import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/daily.yml',import.meta.url),'utf8');
const job=name=>workflow.match(new RegExp('^  '+name+':[\\s\\S]*?(?=^  [a-z]+:|$(?![\\s\\S]))','m'))?.[0]||'';

test('Pages publishes the exact generated revision that passed regression and browser gates',()=>{
 const update=job('update'),browser=job('browser'),deploy=job('deploy');
 assert.ok(update.indexOf('node scripts/build-comparisons.mjs')<update.lastIndexOf('node --test tests/*.test.mjs'));
 assert.ok(update.lastIndexOf('node --test tests/*.test.mjs')<update.indexOf('git commit'));
 assert.match(update,/validated_sha: \$\{\{ steps\.snapshot\.outputs\.sha \}\}/);
 assert.match(update,/id: snapshot[\s\S]*git rev-parse HEAD/);
 assert.match(browser,/needs: update/);
 assert.match(browser,/node tests\/browser-smoke\.mjs/);
 for(const downstream of [browser,deploy]){
  assert.match(downstream,/ref: \$\{\{ needs\.update\.outputs\.validated_sha \}\}/);
 }
 assert.match(deploy,/needs: \[update, browser\]/);
 assert.match(deploy,/needs\.update\.result == 'success' && needs\.browser\.result == 'success'/);
});

test('successful human review workflows publish trusted main without relying on token push events',()=>{
 assert.match(workflow,/workflow_run:\n\s+workflows: \['Five Bars - human offer terms sign-off'\]\n\s+types: \[completed\]\n\s+branches: \[main\]/);
 assert.match(job('update'),/if: github\.event_name != 'workflow_run' \|\| github\.event\.workflow_run\.conclusion == 'success'/);
 assert.match(job('update'),/actions\/checkout@v4\n\s+with:\n\s+ref: main/);
 assert.doesNotMatch(workflow,/ref:.*workflow_run\.(head_sha|head_branch)/);
});
