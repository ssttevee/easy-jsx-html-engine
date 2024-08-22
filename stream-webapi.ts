import {
  type RequestID,
  type RequestData,
  loaderScript,
  ResolvedTemplate,
} from "./suspense";

function noop() {}

export function renderToStream(
  body: JSX.Element | ((rid: RequestID) => JSX.Element),
  waitUntil: (promise: Promise<unknown>) => void = noop,
): ReadableStream<Uint8Array> | Promise<string> | string {
  const rid: RequestID = globalThis.SUSPENSE_ROOT.counter++;

  const requestData: RequestData = { children: [] };

  SUSPENSE_ROOT.requests.set(rid, requestData);

  if (typeof body === "function") {
    try {
      body = body(rid);
    } catch (error) {
      // Avoids memory leaks by removing the request data
      SUSPENSE_ROOT.requests.delete(rid);

      throw error;
    }
  }

  // No suspense was used, just return the HTML
  if (!requestData || !requestData.children.length) {
    SUSPENSE_ROOT.requests.delete(rid);

    return Promise.resolve(body).then((elem) => elem.toHTML());
  }

  const { readable, writable } = new TransformStream();

  waitUntil(
    sendToStream(writable, body, requestData).finally(() => {
      // Removes the current state
      SUSPENSE_ROOT.requests.delete(rid);
    }),
  );

  return readable;
}

async function sendToStream(
  writable: WritableStream,
  layout: JSX.Element,
  requestData: RequestData,
) {
  const w = writable.getWriter();
  try {
    const encoder = new TextEncoder();
    await w.write(encoder.encode((await layout).toHTML()));
    if (!requestData.children.length) {
      return;
    }

    await w.write(encoder.encode(loaderScript));

    let count = 0;
    const children: Array<[Promise<JSX.Element>, number]> = [];
    while (count < requestData.children.length || children.length) {
      for (; count < requestData.children.length; count++) {
        children.push([requestData.children[count], count]);
      }

      const [html, id] = await Promise.race(
        children.map(async ([e, i]) => [await e, i] as const),
      );

      await w.write(
        encoder.encode(
          (
            await ResolvedTemplate({
              id,
              children: html,
            })
          ).toHTML(),
        ),
      );

      children.splice(
        children.findIndex(([, i]) => i === id),
        1,
      );
    }
  } finally {
    await w.close();
    w.releaseLock();
  }
}
