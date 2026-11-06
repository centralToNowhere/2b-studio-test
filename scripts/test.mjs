import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const status = spawnSync('supabase', ['status', '-o', 'json'], {
  encoding: 'utf8',
});
if (status.status !== 0)
  throw new Error('Start local Supabase before running tests.');
const config = JSON.parse(status.stdout);
const url = config.API_URL;
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
  throw new Error('Tests may only run against local Supabase.');
const key = config.PUBLISHABLE_KEY ?? config.ANON_KEY;
const adminKey = config.SECRET_KEY ?? config.SERVICE_ROLE_KEY;
const admin = createClient(url, adminKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: existing, error: listError } = await admin.auth.admin.listUsers({
  perPage: 1000,
});
if (listError) throw listError;
const password = `Crm-test-${randomUUID()}!`;
const users = [];
for (const role of ['supplier', 'assignee'])
  for (let i = 1; i <= 3; i++) {
    const email = `${role}${i}@crm.test`;
    const old = existing.users.find((u) => u.email === email);
    const { data, error } = old
      ? await admin.auth.admin.updateUserById(old.id, {
          password,
          email_confirm: true,
        })
      : await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
    if (error) throw error;
    const names =
      role === 'supplier'
        ? ['Анна Смирнова', 'Михаил Волков', 'Елена Орлова']
        : ['Алексей Козлов', 'Дмитрий Соколов', 'Ирина Морозова'];
    const { error: profileError } = await admin
      .from('Profile')
      .upsert({ id: data.user.id, name: names[i - 1], role });
    if (profileError) throw profileError;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error) throw login.error;
    users.push({
      id: data.user.id,
      email,
      password,
      role,
      token: login.data.session.access_token,
    });
  }
writeFileSync('.test-env.json', JSON.stringify({ url, key, adminKey, users }), {
  mode: 0o600,
});
console.log('Local test users ready: 3 suppliers, 3 assignees.');
const result = spawnSync(
  'yarn',
  ['playwright', 'test', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_PUBLISHABLE_KEY: key,
    },
  },
);
process.exit(result.status ?? 1);
