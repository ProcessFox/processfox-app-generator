import type { NodeUiProps } from '../ui/types.js';

const OP_LABEL: Record<string, string> = {
  eq: 'ist gleich',
  neq: 'ist ungleich',
  contains: 'enthält',
  gt: '>',
  lt: '<',
};

export function FilterUi({ node }: NodeUiProps) {
  const where = node.config.where as { field: string; op: string; value: string } | undefined;
  const sortBy = node.config.sortBy as string | undefined;
  const sortDir = (node.config.sortDir as string) ?? 'asc';

  return (
    <div className="space-y-1 text-sm text-fg-secondary">
      {where ? (
        <p>
          Filter:{' '}
          <span className="font-mono text-xs">
            {where.field} {OP_LABEL[where.op] ?? where.op} „{where.value}"
          </span>
        </p>
      ) : (
        <p>Kein Filter aktiv.</p>
      )}
      {sortBy && (
        <p>
          Sortierung:{' '}
          <span className="font-mono text-xs">
            {sortBy} ({sortDir === 'desc' ? 'absteigend' : 'aufsteigend'})
          </span>
        </p>
      )}
      <p className="text-xs text-fg-quaternary">Kernmechanik gesperrt</p>
    </div>
  );
}
