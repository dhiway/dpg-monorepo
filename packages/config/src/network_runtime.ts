export type ServedDomainBinding = {
  network: string;
  domain: string;
  key: string;
};

export type JsonSchemaDocument = Record<string, unknown>;

export type NetworkDomainConfig = {
  name: string;
  description?: string;
  default_item_schemas?: Record<string, JsonSchemaDocument>;
};

type NetworkInstanceConfig = {
  domain_name: string;
  instance_url: string;
  instance_name?: string;
  schema_url?: string | null;
};

export type NetworkActionInteraction = {
  from_network?: string;
  from_domain: string;
  to_network?: string;
  to_domain: string;
  requirement_schema: JsonSchemaDocument;
  event_schema: JsonSchemaDocument;
};

type NetworkActionConfig = {
  description?: string;
  interactions?: NetworkActionInteraction[];
};

export type NetworkConfig = {
  name: string;
  display_name?: string;
  description?: string;
  schema_standard?: string;
  domains?: NetworkDomainConfig[];
  instances?: NetworkInstanceConfig[];
  actions?: Record<string, NetworkActionConfig>;
};

export type NetworkConfigSource = 'local' | 'remote';

const BINDING_REGEX = /^[a-z][a-z0-9_]*\/[a-z][a-z0-9_]*$/;

export function parseServedDomains(input: string): ServedDomainBinding[] {
  const seen = new Set<string>();

  return input
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (!BINDING_REGEX.test(entry)) {
        throw new Error(
          `Invalid SERVED_DOMAINS entry "${entry}". Expected "network/domain".`
        );
      }

      const [network, domain] = entry.split('/');
      const key = `${network}/${domain}`;

      if (seen.has(key)) {
        return null;
      }

      seen.add(key);
      return { network, domain, key };
    })
    .filter((binding): binding is ServedDomainBinding => binding !== null);
}

export function getAllowedInstanceOriginsFromNetworkConfig(
  networkConfig: NetworkConfig,
  servedDomains: ServedDomainBinding[]
): string[] {
  if (!networkConfig.instances?.length) {
    return [];
  }

  const servedForNetwork = new Set(
    servedDomains
      .filter((binding) => binding.network === networkConfig.name)
      .map((binding) => binding.domain)
  );

  if (servedForNetwork.size === 0) {
    return [];
  }

  const allowedDomains = new Set<string>(servedForNetwork);

  for (const action of Object.values(networkConfig.actions ?? {})) {
    for (const interaction of action.interactions ?? []) {
      if (servedForNetwork.has(interaction.to_domain)) {
        allowedDomains.add(interaction.from_domain);
      }
    }
  }

  return networkConfig.instances
    .filter((instance) => allowedDomains.has(instance.domain_name))
    .map((instance) => toOrigin(instance.instance_url))
    .filter((origin, index, list) => list.indexOf(origin) === index);
}

function toOrigin(url: string): string {
  return new URL(url).origin;
}

export function parseNetworkConfigUrls(input: string): Record<string, string> {
  return Object.fromEntries(
    input
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [network, url] = entry.split('=').map((part) => part.trim());

        if (!network || !url) {
          throw new Error(
            `Invalid NETWORK_CONFIG_URLS entry "${entry}". Expected "network=url".`
          );
        }

        new URL(url);
        return [network, url];
      })
  );
}
