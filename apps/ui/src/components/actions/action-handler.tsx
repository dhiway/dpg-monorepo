import * as React from 'react';
import type { DotActionSchema } from '@/engine/types';
import { ActionModal } from './action-modal';
import { toast } from 'sonner';

interface ActionHandlerProps {
  children: (triggerAction: (type: string, schema: DotActionSchema) => void) => React.ReactNode;
  onActionSubmit?: (
    actionType: string,
    actionSchema: DotActionSchema,
    formData: Record<string, unknown>
  ) => Promise<void> | void;
}

export function ActionHandler({ children, onActionSubmit }: ActionHandlerProps) {
  const [activeAction, setActiveAction] = React.useState<{
    type: string;
    schema: DotActionSchema;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

  const triggerAction = React.useCallback(
    (type: string, schema: DotActionSchema) => {
      if (!schema.requirement_schema) {
        // No form needed, submit directly
        handleDirectSubmit(type, schema);
        return;
      }
      setActiveAction({ type, schema });
    },
    []
  );

  const handleDirectSubmit = async (
    type: string,
    schema: DotActionSchema
  ) => {
    setLoading(true);
    try {
      await onActionSubmit?.(type, schema, {});
      toast.success(`${type} completed successfully`);
    } catch (err) {
      toast.error(`Failed to ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const handleModalSubmit = async (formData: Record<string, unknown>) => {
    if (!activeAction) return;
    setLoading(true);
    try {
      await onActionSubmit?.(activeAction.type, activeAction.schema, formData);
      toast.success(`${activeAction.type} completed successfully`);
      setActiveAction(null);
    } catch (err) {
      toast.error(`Failed to ${activeAction.type}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {children(triggerAction)}
      {activeAction && (
        <ActionModal
          open={!!activeAction}
          onOpenChange={(open) => !open && setActiveAction(null)}
          actionSchema={activeAction.schema}
          onSubmit={handleModalSubmit}
          loading={loading}
        />
      )}
    </>
  );
}
