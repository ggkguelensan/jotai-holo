import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const repository = manifest.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

/** CLI uploads omit .git; pass the published source commit and branch as build env. */
export function sourceLinks({
  commit = process.env.DOCS_SOURCE_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA,
  branch = process.env.DOCS_SOURCE_BRANCH || process.env.VERCEL_GIT_COMMIT_REF,
} = {}) {
  commit ||= git('rev-parse', 'HEAD');
  branch ||= git('rev-parse', '--abbrev-ref', 'HEAD');
  if (!/^[a-f\d]{40,64}$/.test(commit))
    throw new Error('Docs source commit must be a full Git SHA.');
  if (branch === 'HEAD') branch = commit;
  return {
    repository,
    blob: `${repository}/blob/${commit}`,
    edit: `${repository}/edit/${encodeURIComponent(branch)}`,
  };
}
