import * as React from 'react';
import type { RJSFSchema } from '@rjsf/utils';
import type { DotActionSchema } from '@/engine/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { SchemaForm } from '@/components/forms/schema-form';
import { resolveRefs } from '@/engine/schema/resolve-schema';

// Desktop: Dialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Mobile: Drawer
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface ActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionSchema: DotActionSchema;
  onSubmit: (formData: Record<string, unknown>) => void;
  loading?: boolean;
}

const ACTION_FORM_ID = 'action-requirement-form';

export function ActionModal({
  open,
  onOpenChange,
  actionSchema,
  onSubmit,
  loading = false,
}: ActionModalProps) {
  const isMobile = useIsMobile();
  const [resolvedSchema, setResolvedSchema] = React.useState<RJSFSchema | null>(null);

  React.useEffect(() => {
    if (!open) return;

    const reqSchema = actionSchema.requirement_schema;
    if (!reqSchema) {
      setResolvedSchema(null);
      return;
    }

    if ('$ref' in reqSchema && typeof reqSchema.$ref === 'string') {
      resolveRefs(reqSchema as RJSFSchema)
        .then(setResolvedSchema)
        .catch(() => setResolvedSchema(null));
    } else {
      setResolvedSchema(reqSchema as RJSFSchema);
    }
  }, [open, actionSchema]);

  // Shared form content — the Confirm button submits the RJSF form via id,
  // which triggers validation before calling onSubmit with the validated data.
  const formContent = resolvedSchema ? (
    <SchemaForm
      id={ACTION_FORM_ID}
      schema={resolvedSchema}
      hideSubmit
      onSubmit={onSubmit}
    />
  ) : (
    <p className="text-muted-foreground text-sm">
      No additional information required.
    </p>
  );

  // When there's no schema, Confirm fires onSubmit directly with empty data.
  const confirmButtonProps = resolvedSchema
    ? { type: 'submit' as const, form: ACTION_FORM_ID }
    : { type: 'button' as const, onClick: () => onSubmit({}) };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Connect</DrawerTitle>
            <DrawerDescription>
              {actionSchema.from_domain} → {actionSchema.to_domain}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {formContent}
          </div>
          <DrawerFooter>
            <Button {...confirmButtonProps} disabled={loading}>
              {loading ? 'Connecting...' : 'Confirm'}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect</DialogTitle>
          <DialogDescription>
            {actionSchema.from_domain} → {actionSchema.to_domain}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {formContent}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button {...confirmButtonProps} disabled={loading}>
            {loading ? 'Connecting...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
