type MaybePromise<T> = T | PromiseLike<T>;

declare namespace JSX {
  type Element = MaybePromise<{ toHTML(): string }>;

  interface HtmlGlobalAttributes {
    accesskey?: string;
    autocapitalize?:
      | "none"
      | "off"
      | "sentences"
      | "on"
      | "words"
      | "characters";
    class?: import("clsx").ClassValue;
    contenteditable?: boolean | "true" | "false" | "plaintext-only";
    dir?: "ltr" | "rtl" | "auto";
    draggable?: "auto" | "true" | "false";
    enterkeyhint?:
      | "enter"
      | "done"
      | "go"
      | "next"
      | "previous"
      | "search"
      | "send";
    exportparts?: string;
    hidden?: boolean | "hidden" | "until-found";
    id?: string;
    inert?: boolean;
    inputmode?:
      | "none"
      | "text"
      | "tel"
      | "url"
      | "email"
      | "numeric"
      | "decimal"
      | "search";
    itemid?: string;
    itemprop?: string;
    itemref?: string;
    itemscope?: boolean;
    itemtype?: string;
    lang?: boolean | string;
    nonce?: string;
    part?: string;
    popover?: boolean | "auto" | "manual";
    slot?: string;
    spellcheck?: boolean | "true" | "false";
    style?: string;
    tabindex?: number;
    title?: string;
    translate?: boolean | "yes" | "no";

    [attr: `data-${string}`]: any;
  }

  interface JSXReservedAttributes {
    key?: never;
  }
}
