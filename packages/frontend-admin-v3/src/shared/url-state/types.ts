export type HistoryMode = 'replace' | 'push';

export type UrlStateSetOptions = {
  history?: HistoryMode;
};

export type UrlStateConfig<TState extends Record<string, unknown>> = {
  /** Parse search params into normalized state. Must be deterministic. */
  parse: (sp: URLSearchParams) => TState;
  /** Serialize normalized state into search params. Must omit defaults. */
  serialize: (state: TState, sp: URLSearchParams) => URLSearchParams;
  /** Defaults used by reset(). */
  defaults: TState;
};

