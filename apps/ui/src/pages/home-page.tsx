import * as React from 'react';
import type { RJSFSchema } from '@rjsf/utils';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import type {
  DotNetworkSchema,
  DotActionSchema,
  ViewMode,
} from '@/engine/types';
import { filterSchemaByPrivacy } from '@/engine/schema/schema-privacy';
import { resolveNetworkRefs } from '@/engine/schema/resolve-schema';
import { PageShell } from '@/components/layout/page-shell';
import { CardGrid } from '@/components/cards/card-grid';
import { DomainCard } from '@/components/cards/domain-card';
import { ActionHandler } from '@/components/actions/action-handler';
import { MapView } from '@/components/map/map-container';
import '@/components/map/providers';
import { fetchItems, performAction, type Item } from '@/lib/item-api';
import { useAuth } from '@/contexts/auth-context';
import educationNetwork from '../../../../examples/schemas/yellow_dot/network.json';

// Referenced schemas — imported at build time, resolved at runtime via refMap
import studentProfileSchema from '../../../../examples/schemas/domain.json';
import learnerProfileSchema from '../../../../examples/schemas/learner_domain.json';
import tutorCounsellorProfileSchema from '../../../../examples/schemas/tutor_counsellor_domain.json';

const schemaRefMap: Record<string, unknown> = {
  './domain.json': studentProfileSchema,
  './learner_domain.json': learnerProfileSchema,
  './tutor_counsellor_domain.json': tutorCounsellorProfileSchema,
};

function itemToCardItem(item: Item): { id: string; data: Record<string, unknown> } {
  return {
    id: item.item_id,
    data: {
      ...item.item_state,
      item_latitude: item.item_latitude,
      item_longitude: item.item_longitude,
    },
  };
}

function getItemTypeForDomain(network: DotNetworkSchema, domainName: string): string {
  const domain = network.domains.find((d) => d.name === domainName);
  const itemTypeKeys = domain?.item_schemas ? Object.keys(domain.item_schemas) : [];
  return itemTypeKeys.length > 0 ? itemTypeKeys[0] : 'profile';
}

export function HomePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = React.useState('');
  const [viewMode, setViewMode] = React.useState<ViewMode>(
    (searchParams.get('view') as ViewMode) ?? 'list'
  );
  const [selectedDomain, setSelectedDomain] = React.useState<string | null>(
    searchParams.get('domain')
  );
  const [resolvedNetwork, setResolvedNetwork] = React.useState<DotNetworkSchema | null>(null);
  const [domainItems, setDomainItems] = React.useState<Record<string, Item[]>>({});
  const [myItems, setMyItems] = React.useState<Item[]>([]);
  const [activeProfileId, setActiveProfileId] = React.useState<string | null>(
    () => localStorage.getItem('activeProfileId')
  );
  const [loading, setLoading] = React.useState(false);

  // Eagerly resolve all $ref in network before rendering
  React.useEffect(() => {
    resolveNetworkRefs(educationNetwork, { refMap: schemaRefMap }).then((resolved) => {
      setResolvedNetwork(resolved as DotNetworkSchema);
    });
  }, []);

  const network = resolvedNetwork;

  // Fetch all user profiles across all domains to discover their domain
  React.useEffect(() => {
    if (!network || !user) return;
    if (myItems.length > 0) return; // Already fetched

    const controller = new AbortController();

    const domainFetches = network.domains.map((domain) => {
      const itemType = getItemTypeForDomain(network, domain.name);
      return fetchItems({
        item_network: educationNetwork.name,
        item_domain: domain.name,
        item_type: itemType,
        created_by_me: true,
        limit: 100,
      }, controller.signal)
        .then((res) => res.items)
        .catch(() => [] as Item[]);
    });

    Promise.all(domainFetches).then((results) => {
      if (controller.signal.aborted) return;
      const allProfiles = results.flat();
      setMyItems(allProfiles);

      // Auto-select: use stored ID if valid, otherwise first profile
      const storedId = localStorage.getItem('activeProfileId');
      if (storedId && allProfiles.some((p) => p.item_id === storedId)) {
        // stored ID still valid, keep it
      } else if (allProfiles.length > 0) {
        setActiveProfileId(allProfiles[0].item_id);
        localStorage.setItem('activeProfileId', allProfiles[0].item_id);
      } else {
        // No profiles for this user — clear any stale ID from a previous session
        setActiveProfileId(null);
        localStorage.removeItem('activeProfileId');
      }
    });

    return () => { controller.abort(); };
  }, [network, user]);

  // Derive the active profile from myItems
  const myItem = React.useMemo(() => {
    if (!myItems.length) return null;
    return myItems.find((i) => i.item_id === activeProfileId) ?? myItems[0] ?? null;
  }, [myItems, activeProfileId]);

  // Current domain: from ?as= param (demo override), active profile, or network default
  const currentDomain = searchParams.get('as') ?? myItem?.item_domain ?? network?.domains[0]?.name ?? 'student_profile';

  // Domains visible to the current user
  const visibleDomains = React.useMemo(() => {
    if (!network) return [];
    // No profile yet — show all domains so user can browse and create
    if (!myItem) return network.domains;
    // Has profile — show domains the active profile can connect to
    const targetNames = new Set(
      network.actions.connect.interactions
        .filter((i) => i.from_domain === currentDomain)
        .map((i) => i.to_domain)
    );
    return network.domains.filter((d) => targetNames.has(d.name));
  }, [network, currentDomain, myItem]);

  // Fetch items for selected domain(s); when All tab (null) fetch all visible domains in parallel
  React.useEffect(() => {
    if (!network || visibleDomains.length === 0) {
      setDomainItems({});
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const domainsToFetch = selectedDomain === null
      ? visibleDomains
      : visibleDomains.filter((d) => d.name === selectedDomain);

    Promise.all(
      domainsToFetch.map((domain) => {
        const itemType = getItemTypeForDomain(network, domain.name);
        return fetchItems(
          { item_network: educationNetwork.name, item_domain: domain.name, item_type: itemType, limit: 100 },
          controller.signal
        )
          .then((res) => ({ domain: domain.name, items: res.items }))
          .catch(() => ({ domain: domain.name, items: [] as Item[] }));
      })
    )
      .then((results) => {
        if (controller.signal.aborted) return;
        const map: Record<string, Item[]> = {};
        for (const r of results) map[r.domain] = r.items;
        setDomainItems(map);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => { controller.abort(); };
  }, [selectedDomain, visibleDomains, network]);

  // Active schema: from the selected browsing domain, or first visible domain
  const activeSchema = React.useMemo(() => {
    if (!network) return undefined;
    const domainName = selectedDomain ?? visibleDomains[0]?.name;
    const domain = network.domains.find((d) => d.name === domainName) ?? network.domains[0];
    if (!domain) return undefined;
    return domain.item_schemas ? Object.values(domain.item_schemas)[0] : undefined;
  }, [network, selectedDomain, visibleDomains]);

  // Build domain → schema map for sidebar profile title resolution
  const userSchemas = React.useMemo(() => {
    if (!network) return {};
    const map: Record<string, RJSFSchema> = {};
    for (const domain of network.domains) {
      const schema = domain.item_schemas ? Object.values(domain.item_schemas)[0] : undefined;
      if (schema) map[domain.name] = schema;
    }
    return map;
  }, [network]);

  // Active action: matching interaction for the current → selected direction
  const activeAction = React.useMemo<DotActionSchema | null>(() => {
    if (!network || !myItem) return null;
    const toDomain = selectedDomain ?? visibleDomains[0]?.name;
    if (!toDomain) return null;
    const interaction = network.actions.connect.interactions.find(
      (i) => i.from_domain === currentDomain && i.to_domain === toDomain
    );
    if (!interaction) return null;
    return {
      action_type: 'connect',
      from_domain: interaction.from_domain,
      to_domain: interaction.to_domain,
      requirement_schema: interaction.requirement_schema,
      event_schema: interaction.event_schema,
    };
  }, [network, currentDomain, selectedDomain, visibleDomains, myItem]);

  // Build per-domain card items filtered by search
  const filteredDomainItems = React.useMemo(() => {
    const result: Record<string, { id: string; data: Record<string, unknown> }[]> = {};
    for (const [domain, itemList] of Object.entries(domainItems)) {
      const cards = itemList.map(itemToCardItem);
      result[domain] = search
        ? cards.filter((item) =>
            Object.values(item.data).some((val) =>
              String(val).toLowerCase().includes(search.toLowerCase())
            )
          )
        : cards;
    }
    return result;
  }, [domainItems, search]);

  const handleDomainSelect = (domainName: string | null) => {
    setSelectedDomain(domainName);
    setSearchParams((prev) => {
      if (domainName) {
        prev.set('domain', domainName);
      } else {
        prev.delete('domain');
      }
      return prev;
    });
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setSearchParams((prev) => {
      prev.set('view', mode);
      return prev;
    });
  };

  const handleActiveProfileChange = (profileId: string) => {
    setActiveProfileId(profileId);
    localStorage.setItem('activeProfileId', profileId);
  };

  const currentDomainLabel = visibleDomains.find(
    (d) => d.name === selectedDomain
  )?.description;

  const actions = activeAction ? [activeAction] : [];

  if (!network) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading network schemas...</p>
      </div>
    );
  }

  return (
    <PageShell
      domains={visibleDomains}
      selectedDomain={selectedDomain}
      onDomainSelect={handleDomainSelect}
      currentDomainLabel={currentDomainLabel}
      myItems={myItems}
      activeProfileId={activeProfileId}
      onActiveProfileChange={handleActiveProfileChange}
      userSchemas={userSchemas}
      search={search}
      onSearchChange={setSearch}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
    >
      {viewMode === 'list' ? (
        <ActionHandler
          onActionSubmit={async (actionType, _actionSchema, formData, targetItemId) => {
            if (!myItem) {
              toast.error('Create your profile first to connect');
              throw new Error('No source item');
            }
            if (!user) {
              toast.error('You must be signed in to connect');
              throw new Error('No user');
            }
            const allItems = Object.values(domainItems).flat();
            const targetItem = allItems.find((i) => i.item_id === targetItemId);
            if (!targetItem) {
              toast.error('Could not find the target item');
              throw new Error('Target item not found');
            }
            await performAction({
              action_name: actionType,
              source_item: {
                item_network: myItem.item_network,
                item_domain: myItem.item_domain,
                item_type: myItem.item_type,
                item_id: myItem.item_id,
              },
              target_item: {
                item_network: targetItem.item_network,
                item_domain: targetItem.item_domain,
                item_type: targetItem.item_type,
                item_id: targetItem.item_id,
              },
              requirements_snapshot: formData,
              created_by: user.id,
              response_event_type: 'action_response',
              response_event_payload: { status: 'pending', message: '' },
            });
            toast.success('Connection request sent!');
          }}
        >
          {(triggerAction) =>
            selectedDomain === null ? (
              // All tab: flat grid across all domains, each card uses its own schema
              (() => {
                const allFlatItems = visibleDomains.flatMap((domain) => {
                  const domainSchema = domain.item_schemas
                    ? (Object.values(domain.item_schemas)[0] as import('@rjsf/utils').RJSFSchema)
                    : undefined;
                  const domainInteraction = network.actions.connect.interactions.find(
                    (i) => i.from_domain === currentDomain && i.to_domain === domain.name
                  );
                  const domainAction: DotActionSchema | null =
                    myItem && domainInteraction
                      ? {
                          action_type: 'connect',
                          from_domain: domainInteraction.from_domain,
                          to_domain: domainInteraction.to_domain,
                          requirement_schema: domainInteraction.requirement_schema,
                          event_schema: domainInteraction.event_schema,
                        }
                      : null;
                  return (filteredDomainItems[domain.name] ?? []).map((item) => ({
                    item,
                    schema: domainSchema,
                    domainAction,
                    domainDescription: domain.description,
                  }));
                });

                if (loading) {
                  return (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <DomainCard key={i} schema={{}} data={{}} loading />
                      ))}
                    </div>
                  );
                }

                if (allFlatItems.length === 0) {
                  return (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-muted-foreground">
                        {search ? `No results for "${search}"` : 'No items found'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {allFlatItems.map(({ item, schema, domainAction, domainDescription }) => (
                      <DomainCard
                        key={item.id}
                        schema={schema!}
                        schemaDescription={domainDescription}
                        data={item.data}
                        actions={domainAction ? [domainAction] : []}
                        onAction={(type, actionSchema) =>
                          triggerAction(type, actionSchema, item.id)
                        }
                      />
                    ))}
                  </div>
                );
              })()
            ) : (
              // Single domain tab: existing behaviour
              <CardGrid
                schema={activeSchema!}
                schemaName={selectedDomain}
                schemaDescription={currentDomainLabel}
                items={filteredDomainItems[selectedDomain] ?? []}
                actions={actions}
                onAction={(itemId, _type, actionSchema) => {
                  triggerAction(_type, actionSchema, itemId);
                }}
                loading={loading}
                emptyMessage={
                  search
                    ? `No results for "${search}"`
                    : `No ${currentDomainLabel ?? 'items'} found`
                }
              />
            )
          }
        </ActionHandler>
      ) : (
        <MapView
          schema={filterSchemaByPrivacy(activeSchema!, 'public-only')}
          items={Object.values(filteredDomainItems).flat()}
        />
      )}
    </PageShell>
  );
}
