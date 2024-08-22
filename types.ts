export interface Component<P extends {} = any> {
  (props: P): JSX.Element;
}

export type Child =
  | number
  | string
  | boolean
  | null
  | undefined
  | bigint
  | JSX.Element;

export type Children = Child | Promise<Children> | Children[];

export type PropsWithChildren<T extends {} = {}> = { children?: Children } & T;

export type PropsOf<T extends string | Component> =
  T extends Component<infer P>
    ? P
    : T extends keyof JSX.IntrinsicElements
      ? JSX.IntrinsicElements[T]
      : {};
