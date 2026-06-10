import { Env, jsonResponse, withAuth } from '../_shared'

export const onRequestGet: PagesFunction<Env> = (context) => withAuth(context, async () => jsonResponse({
  status: 'OK',
  message: 'TV Tracker API is running',
  dbBackupEnabled: false,
  platform: 'cloudflare-pages',
}))
