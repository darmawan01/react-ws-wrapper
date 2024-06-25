# React Websocket Wrapper

## Installation

```bash
npm i react-ws-wrapper
```

## Wrap your component

```tsx
import WebSocketProvider from '@/context/WebsocketContext';
import { ChildComponent } from './child';

export function App() {
  return (
    <div>
      <WebSocketProvider url={new URL('ws://localhost:3000')}>
        <h1>Hello World</h1>

        <ChildComponent />
      </WebSocketProvider>
    </div>
  );
}
```

## Use the hooks

```tsx
import { useWebSocket } from '@/hooks/useWebsocket';
import { useEffect } from 'react';

export function ChildComponent() {

  const { state, subscribes } = useWebSocket();

  useEffect(() => {
    let unsubscribes = () => { };
    if (state.isConnected) {
      unsubscribes = subscribes([
        { chan: { name: 'test', }, cb: onData },
      ]);
    }
    return () => {
      unsubscribes();
    };
  }, [state]);

  const onData = (data: unknown) => {
    console.log(data);
  };


  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
}
```