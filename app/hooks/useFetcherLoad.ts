import { useFetcher } from "react-router";
import { useEffect, useState } from "react";

type UseFetcherLoadOptions = {
  load?: boolean;
  retry?: boolean;
};

export function useFetcherLoad<T>(
  url: string,
  { load, retry }: UseFetcherLoadOptions = { load: true },
) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const fetcher = useFetcher<T>();

  useEffect(() => {
    if (load && (!hasLoaded || retry)) {
      fetcher.load(url);
      setHasLoaded(true);
    }
  }, [fetcher, hasLoaded, retry, load, url]);
  return fetcher;
}
