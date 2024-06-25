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