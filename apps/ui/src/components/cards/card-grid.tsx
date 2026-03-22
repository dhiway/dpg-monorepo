import type { RJSFSchema } from '@rjsf/utils';
import type { DotActionSchema } from '@/engine/types';
import { DomainCard } from './domain-card';

interface CardGridProps {
  schema: RJSFSchema;
  schemaName?: string;
  schemaDescription?: string;
  items: Array<{ id: string; data: Record<string, unknown> }>;
  actions?: DotActionSchema[];
  onAction?: (itemId: string, type: string, schema: DotActionSchema) => void;
  onItemClick?: (itemId: string) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export function CardGrid({
  schema,
  schemaName,
  schemaDescription,
  items,
  actions = [],
  onAction,
  onItemClick,
  loading = false,
  emptyMessage = 'No items found',
}: CardGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <DomainCard
            key={i}
            schema={schema}
            data={{}}
            loading
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <DomainCard
          key={item.id}
          schema={schema}
          schemaName={schemaName}
          schemaDescription={schemaDescription}
          data={item.data}
          actions={actions}
          onAction={(type, actionSchema) =>
            onAction?.(item.id, type, actionSchema)
          }
          onClick={() => onItemClick?.(item.id)}
        />
      ))}
    </div>
  );
}
