import test from 'ava';
import { exec } from 'child_process';
import { copyFileSync } from 'fs';
import { readFileSync } from 'fs';
import * as util from 'util';

const execAsync = util.promisify(exec);

function stripCwd(str: string): string {
  return str.replace(new RegExp(process.cwd(), 'g'), '${cwd}');
}

test('it aborts on unrecognised flags', async t => {
  await t.throwsAsync(() => execAsync(`node dist/embedme.js test/fixtures/fixture.md --this-is-not-a-valid-flag`));
});

test('it edits the file in place, embedding code snippets', async t => {
  const src = `test/fixtures/fixture.md`;
  const filename = `test/fixtures/fixture-in-place.md`;
  await copyFileSync(`test/fixtures/fixture-source.md`, filename);
  const before = readFileSync(filename, 'utf8');

  const { stdout, stderr } = await execAsync(`node dist/embedme.js ${filename}`);
  const after = readFileSync(filename, 'utf8');

  const fileContentSource = readFileSync(src, 'utf8');

  t.is(after, fileContentSource);
  t.not(before, after);

  t.snapshot(after, 'File content does not match');
  t.snapshot(stripCwd(stdout), 'stdout does not match');
  t.snapshot(stderr, 'stderr does not match');
});

test('it does not change source file with --dry-run', async t => {
  const src = `test/fixtures/fixture-source.md`;
  const before = readFileSync(src, 'utf8');

  await execAsync(`node dist/embedme.js test/fixtures/fixture-source.md --dry-run`);

  const after = readFileSync(src, 'utf8');

  t.is(before, after);

  t.pass();
});
