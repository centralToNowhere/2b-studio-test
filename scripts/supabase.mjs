import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
if (args[0] === 'link' && args.length === 1)
  args.push('--project-ref', process.env.SUPABASE_PROJECT_REF);
const result = spawnSync('supabase', args, {
  stdio: 'inherit',
  env: { ...process.env, SUPABASE_DB_PASSWORD: process.env.DB_PASSWORD ?? '' },
});
process.exit(result.status ?? 1);
