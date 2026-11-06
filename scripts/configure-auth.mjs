// Explicit administrative setup for a manually provisioned application.
const response = await fetch(
  `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/config/auth`,
  {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ disable_signup: true }),
  },
);
if (!response.ok)
  throw new Error(`Auth configuration failed: HTTP ${response.status}`);
const config = await response.json();
console.log(`Public signup disabled: ${config.disable_signup === true}`);
