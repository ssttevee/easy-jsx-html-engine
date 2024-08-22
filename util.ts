import * as htmlescaper from "html-escaper";

import { Child, Children } from "./types";

export function isPromise<T>(
  value: T | Promise<T> | PromiseLike<T> | null | undefined,
): value is PromiseLike<T> {
  return !!(value as any)?.then;
}

export function normalizeChildren(
  children: Children = [],
): Promise<Child[]> | Child[] {
  children = Array.isArray(children) ? children : [children];
  // @ts-ignore
  children = children.flat(Infinity);
  if (children.some(isPromise)) {
    return Promise.all(children as Promise<Child>[]).then(normalizeChildren);
  }

  return children as Child[];
}

export const escapeHTML = htmlescaper.escape;
