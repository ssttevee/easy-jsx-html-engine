/// <reference path="jsx/index.d.ts" preserve="true" />
/// <reference path="jsx/intrinsics.d.ts" preserve="true" />

import { Child, createElement, type Component, Fragment } from "./index";

export function jsx(
  name: string | Component,
  { children, ...attrs }: Record<string, any>,
): JSX.Element {
  return createElement(
    name,
    attrs,
    ...(Array.isArray(children) ? children : [children]),
  );
}

export { jsx as jsxs, jsx as jsxDEV, Fragment };
