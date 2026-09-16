export async function register() {
  const required = ['DT_ENV_URL', 'DT_TOKEN']
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Copy .env.local.example to .env.local and fill in the values.'
    )
  }
}
