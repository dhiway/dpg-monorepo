import type { RJSFSchema } from '@rjsf/utils';
import type { DotActionSchema } from '@/engine/types';
import { CardGrid } from '@/components/cards/card-grid';
import { ActionHandler } from '@/components/actions/action-handler';

interface ListViewPageProps {
  schema: RJSFSchema;
  schemaName?: string;
  items: Array<{ id: string; data: Record<string, unknown> }>;
  actions: DotActionSchema[];
  onActionSubmit?: (
    itemId: string,
    actionType: string,
    actionSchema: DotActionSchema,
    formData: Record<string, unknown>
  ) => Promise<void> | void;
  loading?: boolean;
  emptyMessage?: string;
}

export function ListViewPage({
  schema,
  schemaName,
  items,
  actions,
  onActionSubmit: _onActionSubmit,
  loading = false,
  emptyMessage,
}: ListViewPageProps) {
  return (
    <ActionHandler
      onActionSubmit={async (actionType, _actionSchema, formData) => {
        console.log('Action submitted:', actionType, formData);
      }}
    >
      {(triggerAction) => (
        <CardGrid
          schema={schema}
          schemaName={schemaName}
          items={items}
          actions={actions}
          onAction={(_itemId, type, actionSchema) => {
            triggerAction(type, actionSchema);
          }}
          loading={loading}
          emptyMessage={emptyMessage}
        />
      )}
    </ActionHandler>
  );
}
