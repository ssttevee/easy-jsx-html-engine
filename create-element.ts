import clsx from "clsx";

import type { Child, Children, Component, PropsWithChildren } from "./types";
import { escapeHTML, isPromise, normalizeChildren } from "./util";
import { isVoidElem, VoidElem } from "./intrinsics";

class Element {
  public constructor(
    public name: string,
    public attrs: { children: string; [attr: string]: any },
  ) {}

  public toHTML() {
    const { children, ...attrs } = this.attrs;
    const attrEntries = Object.entries(attrs);
    return `<${this.name}${
      attrEntries.length
        ? " " +
          attrEntries
            .map(([key, value]) =>
              typeof value === "boolean"
                ? value
                  ? key
                  : ""
                : `${key}="${value}"`,
            )
            .join(" ")
        : ""
    }>${isVoidElem(this.name) ? "" : children}</${this.name}>`;
  }
}

export function childrenToString(children: Child[]): string {
  return children
    .filter(Boolean)
    .map((child: any) =>
      child?.toHTML
        ? child.toHTML()
        : typeof child === "string"
          ? escapeHTML(child)
          : child.toString(),
    )
    .join("");
}

export function createElement<S extends VoidElem>(
  name: S,
  attrs?: JSX.IntrinsicElements[S] & Record<string, any>,
): JSX.Element;

export function createElement<
  S extends Exclude<keyof JSX.IntrinsicElements, VoidElem>,
>(
  name: S,
  attrs?: JSX.IntrinsicElements[S] & Record<string, any>,
  ...children: Children[]
): JSX.Element;

export function createElement(
  name: string,
  attrs?: JSX.HtmlGlobalAttributes & Record<string, any>,
  ...children: Children[]
): JSX.Element;

export function createElement<P extends {} = {}>(
  name: Component<P>,
  attrs?: Omit<P, "children"> &
    (P extends { children?: any } ? PropsWithChildren : {}),
  ...children: P extends { children?: any } ? Children[] : []
): JSX.Element;

export function createElement(
  name: string | Component,
  attrs?: JSX.HtmlGlobalAttributes & Record<string, any>,
  ...children: Children[]
): JSX.Element;

export function createElement(
  name: string | Component,
  attrs: JSX.HtmlGlobalAttributes & Record<string, any> = {},
  ...children: Children[]
): JSX.Element {
  if (typeof name === "function") {
    return name({ ...attrs, children });
  }

  const { children: _, class: __, ...other } = attrs;
  const normalized = normalizeChildren(children);
  if (isPromise(normalized)) {
    return normalized.then((children) => createElement(name, attrs, children));
  }

  const escapedAttrs = Object.fromEntries(
    Object.entries(other).map(([key, value]) => [
      key,
      typeof value === "string" ? escapeHTML(value) : value,
    ]),
  );

  if ("class" in attrs) {
    escapedAttrs.class = clsx(attrs.class);
  }

  return new Element(name, {
    ...other,
    children: childrenToString(normalized),
  });
}

class NoEscape {
  public constructor(public str: string) {}
  public toHTML() {
    return this.str;
  }
}

export function dangerouslyPreventEscaping(str: string): JSX.Element {
  return new NoEscape(str);
}

export function Fragment(props: PropsWithChildren): JSX.Element {
  const children = normalizeChildren(props.children);
  if (isPromise(children)) {
    return children.then((children) => createElement(Fragment, {}, children));
  }

  return dangerouslyPreventEscaping(childrenToString(children));
}
