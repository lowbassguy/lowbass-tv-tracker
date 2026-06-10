import {
  Env,
  deserializeShow,
  jsonResponse,
  methodNotAllowed,
  serializeShow,
  showColumns,
  showValues,
  withAuth,
} from '../../_shared'

export const onRequestGet: PagesFunction<Env> = (context) => withAuth(context, async () => {
  const { results } = await context.env.DB
    .prepare('SELECT * FROM shows ORDER BY addedDate DESC')
    .all()

  return jsonResponse(results.map((row) => deserializeShow(row as Record<string, unknown>)))
})

export const onRequestPost: PagesFunction<Env> = (context) => withAuth(context, async () => {
  const show = await context.request.json<Record<string, unknown>>()
  const serializedShow = serializeShow(show)
  const placeholders = showColumns.map(() => '?').join(', ')

  await context.env.DB
    .prepare(`INSERT OR REPLACE INTO shows (${showColumns.join(', ')}) VALUES (${placeholders})`)
    .bind(...showValues(serializedShow))
    .run()

  return jsonResponse({ success: true, id: serializedShow.id })
})

export const onRequest: PagesFunction<Env> = () => methodNotAllowed()
