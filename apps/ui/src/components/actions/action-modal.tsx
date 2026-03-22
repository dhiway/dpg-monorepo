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

export function ActionModal({
  open,
  onOpenChange,
  actionSchema,
  onSubmit,
  loading = false,
}: ActionModalProps) {
  const isMobile = useIsMobile();
  const [resolvedSchema, setResolvedSchema] = React.useState<RJSFSchema | null>(null);
  const [formData, setFormData] = React.useState<Record<string, unknown>>({});
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

  const handleSubmit = () => {
    onSubmit(formData);
  };

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
            {resolvedSchema ? (
              <SchemaForm
                schema={resolvedSchema}
                onSubmit={(data) => {
                  setFormData(data);
                }}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                No additional information required.
              </p>
            )}
          </div>
          <DrawerFooter>
            <Button onClick={handleSubmit} disabled={loading}>
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
          {resolvedSchema ? (
            <SchemaForm
              schema={resolvedSchema}
              onSubmit={(data) => {
                setFormData(data);
              }}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              No additional information required.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Connecting...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
