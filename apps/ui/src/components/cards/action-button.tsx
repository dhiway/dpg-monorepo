import { Button } from '@/components/ui/button';
import { Plug, Bookmark, Share2 } from 'lucide-react';
import type { DotActionSchema } from '@/engine/types';

interface ActionButtonProps {
  actionType: string;
  actionSchema: DotActionSchema;
  onAction: (type: string, schema: DotActionSchema) => void;
}

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  connect: Plug,
  bookmark: Bookmark,
  share: Share2,
};

export function ActionButton({
  actionType,
  actionSchema,
  onAction,
}: ActionButtonProps) {
  const Icon = actionIcons[actionType] ?? Plug;
  const label = actionType.charAt(0).toUpperCase() + actionType.slice(1);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        onAction(actionType, actionSchema);
      }}
      className="gap-1.5 min-w-0 max-w-full"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </Button>
  );
}
