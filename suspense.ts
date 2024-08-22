import { ErrorBoundary } from "./error-boundary";
import type { Children, PropsWithChildren } from "./types";
import { isPromise, normalizeChildren } from "./util";
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
<script id="suspense">
(function(){
var d=document,q=d.querySelector.bind(d),a="[data-suspense]#s:",p="div"+a+"p",t="template"+a+"t",s="script"+a+"s";
window.suspense={
  tp(id) {
    var x = q(p+id),
        y = q(t+id),
        z = q(s+id);

    x.replaceWith(y.content.cloneNode());
    y.remove();
    z.remove();
  }
};
})()
</script>
`.replace(/\n?\s+/g, "");

export interface SuspenseProps {
  // The request ID from renderToStream
  rid: RequestID;

  children?: Children;

  // this is the fallback while the children are loading
  fallback: JSX.Element;

  // catch is passed to ErrorBoundary
  catch?: ((error: any) => JSX.Element) | JSX.Element;
}

export function Suspense(props: SuspenseProps) {
  const children = normalizeChildren(props.children);
  if (
    !isPromise(children) ||
    !props.rid ||
    !SUSPENSE_ROOT.requests.has(props.rid)
  ) {
    // just pretend this suspense doesn't exist
    return Fragment({ children });
  }

  const data = SUSPENSE_ROOT.requests.get(props.rid)!;

  const id = data.children.length;

  data.children.push(
    children.then((children) =>
      ErrorBoundary({ catch: props.catch, children }),
    ),
  );

  return createElement(
    "div",
    {
      "data-suspense": true,
      id: "s:p" + id,
    },
    props.fallback,
  );
}

export interface ResolvedTemplateProps extends PropsWithChildren {
  id: number;
}

export function ResolvedTemplate({ id, children }: ResolvedTemplateProps) {
  return createElement(
    Fragment,
    {},
    createElement(
      "template",
      {
        "data-suspense": true,
        id: "s:r" + id,
      },
      children,
    ),
    createElement(
      "script",
      {
        "data-suspense": true,
        id: "s:s" + id,
      },
      dangerouslyPreventEscaping(`suspense.transplant(${id})`),
    ),
  );
}
