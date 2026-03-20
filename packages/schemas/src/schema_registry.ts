type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

type JsonObject = {
  [key: string]: JsonValue | unknown;
};

type FetchLike = typeof fetch;

export type FetchSchemaOptions = {
  fetchFn?: FetchLike;
  resolveRefs?: boolean;
};

export class fetchSchema {
  public readonly url: string;
  public readonly ready: Promise<JsonValue | unknown>;
  public schema: JsonValue | unknown | null = null;

  private readonly fetchFn: FetchLike;
  private readonly resolveRefs: boolean;
  private readonly documentCache = new Map<string, Promise<JsonValue | unknown>>();

  constructor(url: string | URL, options: FetchSchemaOptions = {}) {
    this.url = url.toString();
    this.fetchFn = options.fetchFn ?? fetch;
    this.resolveRefs = options.resolveRefs ?? true;
    this.ready = this.load();
  }

  public async getSchema(): Promise<JsonValue | unknown> {
    return this.ready;
  }

  private async load(): Promise<JsonValue | unknown> {
    const document = await this.fetchDocument(this.url);
    const resolved = this.resolveRefs
      ? await this.resolveNode(document, new URL(this.url), document)
      : document;

    this.schema = resolved;
    return resolved;
  }

  private async fetchDocument(url: string): Promise<JsonValue | unknown> {
    const normalizedUrl = new URL(url).toString();
    const cachedDocument = this.documentCache.get(normalizedUrl);

    if (cachedDocument) {
      return cachedDocument;
    }

    const pendingDocument = this.fetchFn(normalizedUrl).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to fetch schema from ${normalizedUrl}: ${response.status} ${response.statusText}`,
        );
      }

      return (await response.json()) as JsonValue | unknown;
    });

    this.documentCache.set(normalizedUrl, pendingDocument);
    return pendingDocument;
  }

  private async resolveNode(
    node: JsonValue | unknown,
    baseUrl: URL,
    rootDocument: JsonValue | unknown,
  ): Promise<JsonValue | unknown> {
    if (Array.isArray(node)) {
      return Promise.all(
        node.map((value) => this.resolveNode(value, baseUrl, rootDocument)),
      );
    }

    if (!this.isObject(node)) {
      return node;
    }

    if (typeof node.$ref === 'string') {
      const resolvedReference = await this.resolveReference(
        node.$ref,
        baseUrl,
        rootDocument,
      );
      const siblingEntries = Object.entries(node).filter(([key]) => key !== '$ref');

      if (siblingEntries.length === 0) {
        return resolvedReference;
      }

      const resolvedSiblings = (await this.resolveNode(
        Object.fromEntries(siblingEntries),
        baseUrl,
        rootDocument,
      )) as JsonObject;

      if (this.isObject(resolvedReference)) {
        return {
          ...resolvedReference,
          ...resolvedSiblings,
        };
      }

      return {
        value: resolvedReference,
        ...resolvedSiblings,
      };
    }

    const resolvedEntries = await Promise.all(
      Object.entries(node).map(async ([key, value]) => [
        key,
        await this.resolveNode(value, baseUrl, rootDocument),
      ]),
    );

    return Object.fromEntries(resolvedEntries);
  }

  private async resolveReference(
    reference: string,
    baseUrl: URL,
    rootDocument: JsonValue | unknown,
  ): Promise<JsonValue | unknown> {
    if (reference.startsWith('#')) {
      const fragmentValue = this.getFragmentValue(rootDocument, reference);
      return this.resolveNode(fragmentValue, baseUrl, rootDocument);
    }

    const referenceUrl = new URL(reference, baseUrl);
    const documentUrl = new URL(referenceUrl.toString());
    documentUrl.hash = '';

    const referencedDocument = await this.fetchDocument(documentUrl.toString());
    const referencedRoot = referencedDocument;
    const referencedValue = referenceUrl.hash
      ? this.getFragmentValue(referencedDocument, referenceUrl.hash)
      : referencedDocument;

    return this.resolveNode(referencedValue, documentUrl, referencedRoot);
  }

  private getFragmentValue(
    document: JsonValue | unknown,
    fragment: string,
  ): JsonValue | unknown {
    if (fragment === '#') {
      return document;
    }

    const pathSegments = fragment
      .slice(1)
      .split('/')
      .filter(Boolean)
      .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

    let currentValue: JsonValue | unknown = document;

    for (const segment of pathSegments) {
      if (Array.isArray(currentValue)) {
        const index = Number(segment);

        if (!Number.isInteger(index) || index < 0 || index >= currentValue.length) {
          throw new Error(`Invalid schema reference fragment: ${fragment}`);
        }

        currentValue = currentValue[index];
        continue;
      }

      if (this.isObject(currentValue) && segment in currentValue) {
        currentValue = currentValue[segment];
        continue;
      }

      throw new Error(`Invalid schema reference fragment: ${fragment}`);
    }

    return currentValue;
  }

  private isObject(value: JsonValue | unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

export const FetchSchema = fetchSchema;
