import { createContext, FC, PropsWithChildren, useEffect, useRef, useState } from 'react';


interface Channel {
  name: string;
  args?: unknown;
}

type ChanCallback = (data: unknown) => void;

interface Response {
  jsonrpc: string;
  method?: string;
  id: number;
  result: unknown;
}

interface SubscriptionResult {
  channel: string;
  data: unknown;
}

interface WebsocketState {
  status?: 'connected' | 'reconnecting' | 'disconnected' | 'error' | 'authenticating' | 'authenticated';
  isConnected?: boolean;
  isAuthenticated?: boolean;
}

interface WebSocketContextType {
  subscribes: (channels: { chan: Channel, cb: ChanCallback; }[]) => () => void;
  sendMessage: (channel: string, params: unknown, cb: ChanCallback) => void;

  state: WebsocketState;
}


function randomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);


const WebSocketProvider: FC<PropsWithChildren & { url: URL; }> = ({ children , url}) => {
  const wsRef = useRef<WebSocket | null>(null);
  const subscriptionsRef = useRef<Record<string, ChanCallback[]>>({});
  const [state, setState] = useState<WebsocketState>({});
  const waitforResponseTo = useRef<NodeJS.Timeout>();
  const retrySendMessageTo = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const init = (initiated = false) => {
      console.log("[WebSocket] connecting...");

      wsRef.current = new WebSocket(url);

      if (!subscriptionsRef.current['state']) {
        subscriptionsRef.current['state'] = [];
      }

      subscriptionsRef.current['state'].push(onWebsocketState);

      wsRef.current.onerror = (_error) => {
        subscriptionsRef.current['state']
          .forEach(cb =>
            cb({ status: 'error', } as WebsocketState),
          );
      };

      wsRef.current.onclose = () => {
        subscriptionsRef.current['state']
          .forEach(cb =>
            cb({ status: 'disconnected', } as WebsocketState),
          );

        setTimeout(() => {
          subscriptionsRef.current['state']
            .forEach(cb =>
              cb({ status: 'reconnecting', } as WebsocketState),
            );

          init(true);
        }, 1000);
      };

      wsRef.current.onopen = () => {
        subscriptionsRef.current['state']
          .forEach(cb =>
            cb({
              status: 'connected',
              isConnected: true
            } as WebsocketState),
          );

        if (initiated) {
          // TODO: handle on connect
        }
      };

      wsRef.current.onmessage = (event: MessageEvent) => {
        const res = JSON.parse(event.data) as Response;

        const subscriptionResult = res.result as SubscriptionResult;

        if (subscriptionResult && subscriptionsRef.current[subscriptionResult.channel]) {
          subscriptionsRef.current[subscriptionResult.channel].forEach(cb => cb(subscriptionResult.data));
        } else if (subscriptionsRef.current[res.id]) {
          subscriptionsRef.current[res.id].forEach(cb => cb(res.result));

          delete subscriptionsRef.current[res.id];
        } else {
          console.log('[WebSocket] Unhandled message', res);
        }
      };

    };

    init();

    return () => {
      wsRef.current?.close();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onWebsocketState = (data: unknown) => {
    const obj = data as WebsocketState;
    console.log(`[WebSocket] ${obj.status}`);

    setState(obj);
  };


  const subscribes = (channels: { chan: Channel, cb: ChanCallback; }[]) => {
    for (const { chan, cb } of channels) {
      if (!subscriptionsRef.current[chan.name]) {
        subscriptionsRef.current[chan.name] = [];
      }

      if (!subscriptionsRef.current[chan.name].length) {
        sendMessage("private/subscribe", { channels: [chan] }, cb);
      }

      subscriptionsRef.current[chan.name].push(cb);
    }

    return () => {
      for (const { chan, cb } of channels) {
        if (subscriptionsRef.current[chan.name]) {
          subscriptionsRef.current[chan.name].splice(subscriptionsRef.current[chan.name].indexOf(cb), 1);
        }

        if (!subscriptionsRef.current[chan.name].length) {
          sendMessage("private/unsubscribe", { channels: [chan] }, cb);
        }
      }

    };
  };

  const sendMessage = (channel: string, params: unknown, cb?: ChanCallback, retry = 0, id = randomInt(1, 1000000)) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;

    const payload = {
      method: channel,
      jsonrpc: "2.0",
      id,
      params
    };

    try {
      wsRef.current?.send(JSON.stringify(payload));
    } catch (error) {
      console.log('[WebSocket] sendMessage error:', error);

      if (retry < 3) {
        clearTimeout(retrySendMessageTo.current);
        retrySendMessageTo.current = setTimeout(() => {
          sendMessage(channel, params, cb, retry + 1, id);
          clearTimeout(retrySendMessageTo.current);
        }, 500);
      }
    }

    if (!cb) return;

    subscriptionsRef.current = {
      ...subscriptionsRef.current,
      [id]: [cb],
    };
  };

  /**
   * 
   * @deprecated use single subscribe instead
   */
  const waitForConnection = async () => {
    return new Promise<void>((resolve) => {
      clearInterval(waitforResponseTo.current);
      waitforResponseTo.current = setInterval(() => {
        if (state.isConnected) {
          clearInterval(waitforResponseTo.current);
          resolve();
        }
      }, 100);
    });
  };

  const contextValue: WebSocketContextType = {
    sendMessage,
    subscribes,

    state,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketProvider;