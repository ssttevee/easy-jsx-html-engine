# Easy JSX HTML Engine

Dead simple HTML engine using JSX syntax. Inspired by [@kitajs/html](https://github.com/kitajs/html) with safety by default and WebAPI streams.

## Quick Start

Open your terminal and run the following command:

```sh
npm install easy-jsx-html-engine
```

Add the following options to your tsconfig.json file:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "easy-jsx-html-engine",
  }
}
```

Then, you can use the engine like this:

```tsx
const html = (
  <h1>Hello, World!</h1>
).toHTML();
```

You can create a custom component like this:

```tsx
const MyComponent = ({ name }: { name: string }) => (
  <h1>Hello, {name}!</h1>
);

const html = (
  <MyComponent name="World" />
).toHTML();
```

It also works with async functions:

```tsx
async function MyAsyncComponent({ name }: { name: string }) {
  return (
    <h1>Hello, {name}!</h1>
  );
}

const html = (
  await <div><MyAsyncComponent name="World" /></div>
).toHTML();
```

ErrorBoundary is supported:

```tsx
async function BadComponent() {
  throw new Error('Bad component');
}

const html = (
  <ErrorBoundary catch={<h1>Something went wrong</h1>}>
    <BadComponent />
  </ErrorBoundary>
).toHTML();
```

Even Suspense is supported:

```tsx
import { renderToStream } from "easy-jsx-html-engine/stream-webapi";

async function MyAsyncComponent({ name }: { name: string }) {
  return (
    <h1>Hello, {name}!</h1>
  );
}

const stream: ReadableStream = renderToStream(
  (rid) => (
    <Suspense rid={rid} fallback={<h1>Loading...</h1>} catch={<h1>Something went wrong</h1>}>
      <MyAsyncComponent />
    </Suspense>
  ),
);
```

## Safety By Default

The engine is designed to be safe by default to prevent unwanted html injections.

This relies on a simple interface with a `toHTML` method that returns a string. This is what the engine uses to determine whether to escape the content or not.

However, it sometimes may be necessary to inject unescaped content. In this case, you can use the `dangerouslyPreventEscaping` function:

```tsx
const html = (
  <div>
    {dangerouslyPreventEscaping('<h1>Hello, World!</h1>')}
  </div>
).toHTML();
```

## Async Components

You may use async functions to create components and even insert promises as a child, however this causes all parent elements to become async unless a `Suspense` component is used.

The engine will wait for all child promises to resolve with `Promise.all` before rendering the parent element.

```tsx
const html = (
  await (
    <h1>Hello, {Promise.resolve("World"}!</h1>
  )
).toHTML();
```

## Error Boundary

You may use the `ErrorBoundary` component to catch errors and display a fallback component.

It works great with async components and promises:

```tsx
const html = (
  await (
    <ErrorBoundary catch={(err) => <div>Something went wrong: {err.message}</div>}>
      <h1>Hello, {Promise.reject(new Error("no"))}!</h1>
    </ErrorBoundary>
  )
).toHTML();
```

But needs a little extra for sync errors:

```tsx
const html = (
  await (
    <ErrorBoundary catch={(err) => <div>Something went wrong: {err.message}</div>}>
      {() => {
        throw new Error("no");
      }}
    </ErrorBoundary>
  )
).toHTML();
```

## Suspense and Streams

`Suspense` is an extension of the `ErrorBoundary` component that allows you to display a fallback component while waiting for async components to resolve.

This works by rendering a placeholder component in place of the actual content and then replacing it with the resolved content once it is ready.

Note that this is only effective when rendering to a stream and requires an implementation specific to your runtime environment.

There is currently only one implementation for environments with WebAPI streams (such as service workers, Bun, Deno, and Cloudflare Workers):

```tsx
import { renderToStream } from "easy-jsx-html-engine/stream-webapi";

const server = Bun.serve({
  port: 3000,
  async fetch(request) {
    return new Response(
      await renderToStream(
        (rid) => (
          <Suspense rid={rid} fallback={<h1>Loading...</h1>} catch={<h1>Something went wrong</h1>}>
            <MyAsyncComponent />
          </Suspense>
        ),
      )
    );
  },
});
```

`renderToStream` returns a `string | Promise<string> | ReadableStream<Uint8Array>` depending on the component tree. If the tree contains any `Suspense` elements, it will return a `ReadableStream`. Otherwise, it will return a `string` or `Promise<string>`. While it is possible to use `renderToStream` without `await`ing the result, it is recommended to ensure that no errors occur if a promise is returned unexpectedly.

The `rid` or request ID is used to identify the stream and is passed to the `Suspense` component. This is necessary to ensure that the correct stream is resumed when the async component resolves. It is only valid for the duration of the request and should not be stored for any longer than that.

## Contexts

Just like [@kitajs/html](https://github.com/kitajs/html), there is no support for contexts for the [same reasons](https://github.com/kitajs/html/tree/master/packages/html#why-there-is-no-context-api). In short, the purpose of contexts is to avoid prop drilling, but there is no way to keep track of the context in an async environment without prop drilling, thus there is ultimately no benefit.

## Dependencies

This library has only 2 dependencies: `clsx` for class name building and `html-escaper` for escaping html content, both of which are very tiny and excellent libraries with no dependencies of their own.

## Credits

This library was heavily inspired by [@kitajs/html](https://github.com/kitajs/html) as mentioned above, but is completely rewritten from scratch in Typescript with a focus to overcome some of the usability issues and limitations of the original library. Mainly, requiring the "safe" attribute to escape content and the NodeJS requirement. Additionally, it is distributed as an ES module and the stream implementation is designed to be pluggable for different runtime environments.
