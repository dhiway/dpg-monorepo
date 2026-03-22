import type { RJSFSchema } from '@rjsf/utils';
import type { DotActionSchema } from '@/engine/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CardFieldsFromSchema } from './card-field';
import { ActionButton } from './action-button';

interface DomainCardProps {
  schema: RJSFSchema;
  schemaName?: string;
  schemaDescription?: string;
  data: Record<string, unknown>;
  actions?: DotActionSchema[];
  onAction?: (type: string, schema: DotActionSchema) => void;
  loading?: boolean;
  onClick?: () => void;
}

export function DomainCard({
  schema,
  schemaName,
  schemaDescription,
  data,
  actions = [],
  onAction,
  loading = false,
  onClick,
}: DomainCardProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const titleKey = findTitleField(schema);
  const title = titleKey ? String(data[titleKey] ?? schemaName ?? 'Item') : schemaName ?? 'Item';

  return (
    <Card
      className="h-full flex flex-col cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {schemaDescription && (
          <CardDescription>{schemaDescription}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <CardFieldsFromSchema schema={schema} data={data} />
      </CardContent>
      {actions.length > 0 && onAction && (
        <CardFooter className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <ActionButton
              key={action.action_type}
              actionType={action.action_type}
              actionSchema={action}
              onAction={(type, schema) => {
                onAction(type, schema);
              }}
            />
          ))}
        </CardFooter>
      )}
    </Card>
  );
}

function findTitleField(schema: RJSFSchema): string | null {
  if (!schema.properties) return null;
  const candidates = ['name', 'full_name', 'title', 'provider_id', 'learner_id', 'student_id'];
  for (const key of candidates) {
    if (key in schema.properties) return key;
  }
  return Object.keys(schema.properties)[0] ?? null;
}
