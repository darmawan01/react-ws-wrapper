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