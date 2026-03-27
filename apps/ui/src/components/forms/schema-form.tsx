import Form from '@rjsf/shadcn';
import validator from '@rjsf/validator-ajv8';
import type { RJSFSchema, UiSchema, RegistryWidgetsType } from '@rjsf/utils';
import { DatePickerWidget } from './custom-widgets/date-picker-widget';

interface SchemaFormProps {
  schema: RJSFSchema;
  formData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onError?: (errors: unknown[]) => void;
  mode?: 'full' | 'compact';
  disabled?: boolean;
  className?: string;
}

function generateUiSchema(
  schema: RJSFSchema,
  mode: 'full' | 'compact'
): UiSchema {
  const uiSchema: Record<string, unknown> = {};

  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    const typed = prop as RJSFSchema & { private?: boolean; format?: string };

    if (mode === 'compact' && typed.private === true) {
      uiSchema[key] = { 'ui:widget': 'hidden' };
      continue;
    }

    if (typed.format === 'date') {
      uiSchema[key] = { 'ui:widget': 'date' };
    }

    if (typed.format === 'email') {
      uiSchema[key] = { 'ui:placeholder': 'email@example.com' };
    }

    if (typed.enum && typed.type === 'string') {
      uiSchema[key] = { 'ui:placeholder': 'Select...' };
    }
  }

  return uiSchema;
}

const widgets: RegistryWidgetsType = {
  date: DatePickerWidget,
};

function stripMetaSchema(schema: RJSFSchema): RJSFSchema {
  const { $schema, ...rest } = schema as RJSFSchema & { $schema?: string };
  return rest as RJSFSchema;
}

export function SchemaForm({
  schema,
  formData,
  onSubmit,
  onError,
  mode = 'full',
  disabled = false,
  className,
}: SchemaFormProps) {
  const uiSchema = generateUiSchema(schema, mode);
  const schemaWithoutMeta = stripMetaSchema(schema);

  return (
    <div className={className}>
      <Form
        schema={schemaWithoutMeta}
        uiSchema={uiSchema}
        formData={formData}
        validator={validator}
        widgets={widgets}
        disabled={disabled}
        onSubmit={({ formData }) => {
          if (formData) onSubmit(formData as Record<string, unknown>);
        }}
        onError={(errors) => onError?.(errors)}
        liveValidate={false}
        noHtml5Validate
      />
    </div>
  );
}
