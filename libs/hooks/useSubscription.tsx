import { DependencyList, useEffect, useRef, useState } from "react";
import { useWebSocket } from "./useWebsocket";

interface Props<T> {
  chan: {
    name: string;
    args?: unknown;
  },
  initialValue: T[];
  key?: string;
  // Replace or push the new incoming data
  pushMode?: boolean;
}

export default function useSubscription<T>({ chan, initialValue, key = "id", pushMode = true }: Props<T>, deps?: DependencyList) {
  const dataRef = useRef<T[]>(initialValue);
  const [data, setData] = useState<T[]>(initialValue);
  const {
    subscribes,
    state,
  } = useWebSocket();

  useEffect(() => {
    let unsubscribes = () => { };

    if (state.isAuthenticated) {
      unsubscribes = subscribes([
        { chan, cb: onData },
      ]);
    }

    return () => {
      unsubscribes();
      dataRef.current = initialValue;
      setData(initialValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, ...deps ? deps : []]);


  const onData = (data: unknown) => {
    if (Array.isArray(data)) {
        // TODO: add user defined data handler
      setData(data as T[]);
      dataRef.current = data as T[];
    } else {
      const cleanedData = pushMode ? dataRef.current.concat(data as T) : [data as T];

      setData(cleanedData);
      dataRef.current = cleanedData;
    }
  };

  return {
    data,
    dataRef,
  };
}