export type BackfillCli = {
  dryRun: boolean;
  apply: boolean;
  flags: Set<string>;
};

export function parseBackfillCli(argv = process.argv.slice(2)): BackfillCli {
  const flags = new Set(argv);
  const apply = flags.has('--apply');
  return {
    apply,
    dryRun: !apply,
    flags,
  };
}
