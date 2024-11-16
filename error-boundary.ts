import { createElement, Fragment } from "./create-element";
import type { Children } from "./types";
import { isPromise, normalizeChildren } from "./util";

export interface ErrorBoundaryProps {
  // children can be a function to catch non-async errors
  children?: Children[] | [() => Children];

  // catch is called with the error and should return a JSX element
  catch?: ((error: any) => JSX.Element) | Children;
}

function isFunctionChildren(
  children: ErrorBoundaryProps["children"],
): children is [() => Children] {
  return children?.length === 1 && typeof children[0] === "function";
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  const children = normalizeChildren(
    isFunctionChildren(props.children)
      ? Promise.resolve().then(props.children[0])
      : props.children,
  );
  if (!isPromise(children)) {
    // error boundary can only catch errors in promises or functions
    return createElement(Fragment, {}, children);
  }

  let result = Promise.resolve(createElement(Fragment, {}, children));
  if (props.catch) {
    const c = props.catch;
    result = result.catch(
      typeof c === "function" ? c : () => createElement(Fragment, {}, c),
    );
  }

  return result.catch(defaultCatch);
}

export function defaultCatch(error: any) {
  console.error(error);
  return createElement(
    "pre",
    {},
    error?.stack || error?.message || error || new Error("Unknown error").stack,
  );
}
