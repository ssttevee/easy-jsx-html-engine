import {
  type RequestID,
  type RequestData,
  loaderScript,
  type ResolvedTemplateProps,
  ResolvedTemplate as DefaultResolvedTemplate,
} from "./suspense";
import type { Component } from "./types";

function noop() {}

export interface RenderToStreamOptions {
  waitUntil?: (promise: Promise<unknown>) => void;
  ResolvedTemplate?: Component<ResolvedTemplateProps>;
}

export function renderToStream(
  body: JSX.Element | ((rid: RequestID) => JSX.Element),
  waitUntil?: (promise: Promise<unknown>) => void,
): ReadableStream<Uint8Array> | Promise<string> | string;
export function renderToStream(
  body: JSX.Element | ((rid: RequestID) => JSX.Element),
  options?: RenderToStreamOptions,
): ReadableStream<Uint8Array> | Promise<string> | string;
export function renderToStream(
  body: JSX.Element | ((rid: RequestID) => JSX.Element),
  options?: ((promise: Promise<unknown>) => void) | RenderToStreamOptions,
): ReadableStream<Uint8Array> | Promise<string> | string {
  const waitUntil =
    (typeof options === "object" ? options.waitUntil : options) ?? noop;
  const ResolvedTemplate =
    (typeof options === "object" && options.ResolvedTemplate) ||
    DefaultResolvedTemplate;

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
    sendToStream(writable, body, requestData, ResolvedTemplate).finally(() => {
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
  ResolvedTemplate: Component<ResolvedTemplateProps>,
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
    await w.write(
      encoder.encode("<script data-suspense>suspense.cleanup()</script>"),
    );
  } finally {
    await w.close();
    w.releaseLock();
  }
}
