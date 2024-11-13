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
            .filter(([_, value]) => value || value === 0)
            .map(([key, value]) =>
              value === true
                ? key
                : `${key}="${typeof value === "string" ? value.replace(/"/g, '\\"') : value}"`,
            )
            .join(" ")
        : ""
    }${isVoidElem(this.name) ? "/>" : ">" + children + `</${this.name}>`}`;
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
  ...children: P extends { children?: infer C }
    ? C extends Array<any>
      ? C
      : never
    : []
): JSX.Element;

export function createElement(
  name: string | Component,
  attrs?: JSX.HtmlGlobalAttributes & Record<string, any>,
  ...children: Children[]
): JSX.Element;

export function createElement(
  name: string | Component,
  attrs: JSX.HtmlGlobalAttributes & Record<string, any> = {},
  ...children: any[]
): JSX.Element {
  if (typeof name === "function") {
    const child = name({
      ...attrs,
      children: children?.length ? children : undefined,
    });
    const normalized = normalizeChildren([child]);
    if (isPromise(normalized)) {
      return normalized.then((children) =>
        dangerouslyPreventEscaping(childrenToString(children)),
      );
    }

    return dangerouslyPreventEscaping(childrenToString(normalized));
  }

  // remove children from attrs to avoid extra work if it was erroneously passed in as an attribute
  const { children: _, ...attrsWithoutChildren } = attrs;
  const normalizedChildren = normalizeChildren(children);
  const normalizedAttrs = normalizeAttributes(attrsWithoutChildren);
  if (isPromise(normalizedChildren) || isPromise(normalizedAttrs)) {
    return Promise.all([normalizedAttrs, normalizedChildren]).then(
      ([attrs, children]) => createElement(name, attrs, children),
    );
  }

  const { class: __, ...other } = attrsWithoutChildren;
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
    ...escapedAttrs,
    children: childrenToString(normalizedChildren),
  });
}

function normalizeAttributes<T extends Record<string, any>>(
  attrs: T,
): T | Promise<T> {
  const entries = Object.entries(attrs);
  if (entries.some(([, value]) => isPromise(value))) {
    return Promise.all(
      entries.map(([key, value]) => {
        if (isPromise(value)) {
          return value.then((value) => [key, value]);
        }

        return [key, value];
      }),
    ).then((entries) => Object.fromEntries(entries));
  }

  return attrs;
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
