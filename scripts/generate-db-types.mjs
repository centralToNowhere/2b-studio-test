import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';

const header = `// Generated from the Supabase public schema. Do not edit manually.
// Regenerate: yarn db:types (local) or yarn db:types --remote (linked cloud project).

`;
const result = spawnSync(
  process.execPath,
  [
    '--env-file=.env',
    'scripts/supabase.mjs',
    'gen',
    'types',
    '--lang',
    'typescript',
    '--schema',
    'public',
    ...process.argv.slice(2),
  ],
  { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (!result.stdout.trim())
  throw new Error('Type generation returned no output.');
const output = await format(header + result.stdout, {
  filepath: 'src/shared/api/database.types.ts',
  ...(await (
    await import('prettier')
  ).resolveConfig('src/shared/api/database.types.ts')),
});
writeFileSync('src/shared/api/database.types.ts', output);
console.log('Updated src/shared/api/database.types.ts');
