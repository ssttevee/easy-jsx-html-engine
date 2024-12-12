/// <reference path="jsx/index.d.ts" preserve="true" />
/// <reference path="jsx/intrinsics.d.ts" preserve="true" />

import { Child, createElement, type Component, Fragment } from "./index";

export function jsx(
  name: string | Component,
  props: Record<string, any>,
): JSX.Element {
  if (typeof name === "function") {
    return name(props);
  }

  const { children, ...attrs } = props;
  return createElement(
    name,
    attrs,
    ...(!children ? [] : Array.isArray(children) ? children : [children]),
  );
}

export { jsx as jsxs, jsx as jsxDEV, Fragment };
