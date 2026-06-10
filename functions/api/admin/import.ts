import {
  Env,
  jsonResponse,
  methodNotAllowed,
  serializeShow,
  showColumns,
  showValues,
  withImportAuth,
} from '../../_shared'

export const onRequestPost: PagesFunction<Env> = (context) => withImportAuth(context, async () => {
  const body = await context.request.json<{ shows?: Record<string, unknown>[] }>()
  const shows = body.shows || []

  if (!Array.isArray(shows) || shows.length === 0) {
    return jsonResponse({ error: 'Expected a non-empty shows array' }, { status: 400 })
  }

  const placeholders = showColumns.map(() => '?').join(', ')
  const sql = `INSERT OR REPLACE INTO shows (${showColumns.join(', ')}) VALUES (${placeholders})`

  await context.env.DB.batch(
    shows.map((show) => {
      const serializedShow = serializeShow(show)
      return context.env.DB.prepare(sql).bind(...showValues(serializedShow))
    })
  )

  return jsonResponse({ success: true, imported: shows.length })
})

export const onRequest: PagesFunction<Env> = () => methodNotAllowed()
