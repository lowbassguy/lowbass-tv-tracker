import {
  Env,
  jsonResponse,
  methodNotAllowed,
  serializeShow,
  showColumns,
  showValues,
  withAuth,
} from '../../_shared'

export const onRequestPut: PagesFunction<Env, 'id'> = (context) => withAuth(context, async () => {
  const show = await context.request.json<Record<string, unknown>>()
  const serializedShow = serializeShow(show)
  const updates = showColumns.map((column) => `${column} = ?`).join(', ')

  await context.env.DB
    .prepare(`UPDATE shows SET ${updates} WHERE id = ?`)
    .bind(...showValues(serializedShow), context.params.id)
    .run()

  return jsonResponse({ success: true })
})

export const onRequestDelete: PagesFunction<Env, 'id'> = (context) => withAuth(context, async () => {
  await context.env.DB
    .prepare('DELETE FROM shows WHERE id = ?')
    .bind(context.params.id)
    .run()

  return jsonResponse({ success: true })
})

export const onRequest: PagesFunction<Env> = () => methodNotAllowed()
