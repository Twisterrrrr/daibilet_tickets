import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import type { UrlStateConfig, UrlStateSetOptions } from './types';

export function useUrlState<TState extends Record<string, unknown>>(config: UrlStateConfig<TState>) {
  const [sp, setSp] = useSearchParams();

  const state = React.useMemo(() => config.parse(sp), [sp, config]);

  const setState = React.useCallback(
    (patch: Partial<TState>, opts: UrlStateSetOptions = {}) => {
      const merged = { ...state, ...patch } as TState;
      const out = config.serialize(merged, new URLSearchParams(sp));
      if (out.toString() === sp.toString()) return;
      setSp(out, { replace: (opts.history ?? 'replace') === 'replace' });
    },
    [config, setSp, sp, state],
  );

  const reset = React.useCallback(
    (opts: UrlStateSetOptions = {}) => {
      const out = config.serialize(config.defaults, new URLSearchParams(sp));
      if (out.toString() === sp.toString()) return;
      setSp(out, { replace: (opts.history ?? 'replace') === 'replace' });
    },
    [config, setSp, sp],
  );

  return { state, setState, reset, sp };
}

