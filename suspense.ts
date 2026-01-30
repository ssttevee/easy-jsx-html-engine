import { ErrorBoundary } from "./error-boundary";
import type { Children, Component, PropsWithChildren } from "./types";
import { isPromise } from "./util";
import {
  createElement,
  dangerouslyPreventEscaping,
  Fragment,
} from "./create-element";

declare global {
  var SUSPENSE_ROOT: {
    requests: Map<RequestID, RequestData>;
    counter: number;
  };
}

export interface RequestData {
  children: Promise<JSX.Element>[];
}

if (!globalThis.SUSPENSE_ROOT) {
  globalThis.SUSPENSE_ROOT = {
    requests: new Map(),
    counter: 1,
  };
}

export type RequestID = string | number;

export const loaderScript = `
<script data-suspense>
${`(function(
  d=document,
  q=d.querySelector.bind(d),
  m="[data-suspense]",
  a=m+"#s\\\\:",
){
window.suspense = {
  tp(n) {
    var x = q("div"+a+"p"+n),
        y = q("template"+a+"r"+n),
        z = d.importNode(y.content, true),
        b = Array.from(z.childNodes);

    x.replaceWith(z);
    y.remove();
    q("script"+a+"s"+n).remove();

    return b;
  },
  cleanup() {
    d.querySelectorAll(m).forEach(e => e.remove());
    delete window.suspense;
  }
};
})()`
  // poor-man's minify
  .replace(/(?<!var|return|delete)\s+|[,;]\s*(?=\)|\})/g, "")}
</script>
`;

export interface SuspenseProps {
  // The request ID from renderToStream
  //
  // If this is not provided, the Suspense component will behave like ErrorBoundary
  rid?: RequestID;

  children?: Children;

  // this is the fallback while the children are loading
  fallback: JSX.Element;

  // catch is passed to ErrorBoundary
  catch?: ((error: any) => JSX.Element) | JSX.Element;
}

export function Suspense(props: SuspenseProps) {
  const elem = ErrorBoundary({
    catch: props.catch,
    children: [props.children],
  });
  if (
    !isPromise(elem) ||
    !props.rid ||
    !SUSPENSE_ROOT.requests.has(props.rid)
  ) {
    // just pretend this suspense is an error boundary
    return elem;
  }

  const data = SUSPENSE_ROOT.requests.get(props.rid)!;

  const id = data.children.length;

  data.children.push(Promise.resolve(elem));

  return createElement(
    "div",
    {
      "data-suspense": true,
      id: `s:p${id}`,
    },
    props.fallback,
  );
}

export interface CreateResolvedTemplateOptions {
  resolvedScriptMiddleware?: (baseScript: string, id: number) => string;
}

export interface ResolvedTemplateProps extends PropsWithChildren {
  id: number;
}

export function CreateResolvedTemplate({
  resolvedScriptMiddleware,
}: CreateResolvedTemplateOptions = {}): Component<ResolvedTemplateProps> {
  return function ResolvedTemplate({ id, children }: ResolvedTemplateProps) {
    let script = `suspense.tp(${id})`;
    if (resolvedScriptMiddleware) {
      script = resolvedScriptMiddleware(script, id);
    }

    return createElement(
      Fragment,
      {},
      createElement(
        "template",
        {
          "data-suspense": true,
          id: `s:r${id}`,
        },
        children,
      ),
      createElement(
        "script",
        {
          "data-suspense": true,
          id: `s:s${id}`,
        },
        dangerouslyPreventEscaping(script),
      ),
    );
  };
}

export const ResolvedTemplate = /* @__PURE__ */ CreateResolvedTemplate();
