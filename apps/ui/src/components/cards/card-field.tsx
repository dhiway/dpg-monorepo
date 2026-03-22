import type { RJSFSchema } from '@rjsf/utils';
import { filterDataBySchema } from '@/engine/schema/schema-privacy';

interface CardFieldProps {
  label: string;
  value: unknown;
  type?: string;
}

function CardField({ label, value, type }: CardFieldProps) {
  let displayValue: string;

  if (value === null || value === undefined) {
    displayValue = '—';
  } else if (Array.isArray(value)) {
    displayValue = value
      .map((item) => {
        if (item === null || item === undefined) return '—';
        if (typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          const nameField = obj.name ?? obj.title ?? obj.label ?? obj.credential_type ?? obj.type;
          return nameField != null ? String(nameField) : Object.values(obj).join(' · ');
        }
        return String(item);
      })
      .join(', ');
  } else if (type === 'boolean') {
    displayValue = value ? 'Yes' : 'No';
  } else {
    displayValue = String(value);
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{displayValue}</span>
    </div>
  );
}

interface CardFieldsFromSchemaProps {
  schema: RJSFSchema;
  data: Record<string, unknown>;
}

export function CardFieldsFromSchema({
  schema,
  data,
}: CardFieldsFromSchemaProps) {
  const publicSchema = {
    ...schema,
    properties: Object.fromEntries(
      Object.entries(schema.properties ?? {}).filter(([_, prop]) => {
        const typed = prop as RJSFSchema & { private?: boolean };
        return typed.private !== true;
      })
    ),
  };

  const publicData = filterDataBySchema(data, publicSchema);

  return (
    <div className="grid grid-cols-2 gap-3">
      {Object.entries(publicSchema.properties ?? {}).map(([key, prop]) => {
        const typed = prop as RJSFSchema;
        const label = typed.title ?? key.replace(/_/g, ' ');
        return (
          <CardField
            key={key}
            label={label}
            value={publicData[key]}
            type={typed.type as string}
          />
        );
      })}
    </div>
  );
}
