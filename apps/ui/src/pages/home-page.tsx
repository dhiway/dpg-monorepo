import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

export function HomePage() {
  const navigate = useNavigate();
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
  const [items, setItems] = React.useState<Item[]>([]);
  const [myItem, setMyItem] = React.useState<Item | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Eagerly resolve all $ref in network before rendering
  React.useEffect(() => {
    resolveNetworkRefs(educationNetwork, { refMap: schemaRefMap }).then((resolved) => {
      setResolvedNetwork(resolved as DotNetworkSchema);
    });
  }, []);

  const network = resolvedNetwork;

  // Current domain: driven by ?as= param (demo); defaults to first domain
  const currentDomain = searchParams.get('as') ?? network?.domains[0]?.name ?? 'student_profile';

  // Fetch the current user's own profile item for currentDomain
  React.useEffect(() => {
    if (!network || !user) return;
    fetchItems({
      item_network: educationNetwork.name,
      item_domain: currentDomain,
      item_type: currentItemType,
      created_by_me: true,
      limit: 1,
    })
      .then((response) => setMyItem(response.items[0] ?? null))
      .catch(() => setMyItem(null));
  }, [network, currentDomain, user]);

  // Domains visible to the current user — derived from connect interactions
  const visibleDomains = React.useMemo(() => {
    if (!network) return [];
    const targetNames = new Set(
      network.actions.connect.interactions
        .filter((i) => i.from_domain === currentDomain)
        .map((i) => i.to_domain)
    );
    return network.domains.filter((d) => targetNames.has(d.name));
  }, [network, currentDomain]);

  // Fetch items from API when selectedDomain changes
  const activeDomain = selectedDomain ?? visibleDomains[0]?.name;

  React.useEffect(() => {
    if (!activeDomain || !network) return;

    let cancelled = false;
    setLoading(true);

    fetchItems({
      item_network: educationNetwork.name,
      item_domain: activeDomain,
      item_type: currentItemType,
      limit: 100,
    })
      .then((response) => {
        if (!cancelled) setItems(response.items);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to fetch items:', err);
          toast.error('Failed to load items');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeDomain, network]);

  // Active schema: from the selected browsing domain, or first visible domain
  const activeSchema = React.useMemo(() => {
    if (!network) return undefined;
    const domainName = selectedDomain ?? visibleDomains[0]?.name;
    const domain = network.domains.find((d) => d.name === domainName) ?? network.domains[0];
    if (!domain) return undefined;
    return domain.item_schemas ? Object.values(domain.item_schemas)[0] : undefined;
  }, [network, selectedDomain, visibleDomains]);

  // Get default item type name for current domain (e.g., "profile_1.0")
  const currentItemType = React.useMemo(() => {
    if (!network) return 'profile';
    const domain = network.domains.find((d) => d.name === currentDomain) ?? network.domains[0];
    const itemTypeKeys = domain?.item_schemas ? Object.keys(domain.item_schemas) : [];
    return itemTypeKeys.length > 0 ? itemTypeKeys[0] : 'profile';
  }, [network, currentDomain]);

  // Transform API items to card format
  const cardItems = React.useMemo(() => items.map(itemToCardItem), [items]);

  // Active action: matching interaction for the current → selected direction
  const activeAction = React.useMemo<DotActionSchema | null>(() => {
    if (!network) return null;
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
  }, [network, currentDomain, selectedDomain, visibleDomains]);

  // Filter items by search
  const filteredItems = React.useMemo(() => {
    if (!search) return cardItems;
    const lower = search.toLowerCase();
    return cardItems.filter((item) =>
      Object.values(item.data).some((val) =>
        String(val).toLowerCase().includes(lower)
      )
    );
  }, [cardItems, search]);

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
            const targetItem = items.find((i) => i.item_id === targetItemId);
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
          {(triggerAction) => (
            <CardGrid
              schema={activeSchema!}
              schemaName={selectedDomain ?? visibleDomains[0]?.name}
              schemaDescription={currentDomainLabel}
              items={filteredItems}
              actions={actions}
              onAction={(itemId, _type, actionSchema) => {
                triggerAction(_type, actionSchema, itemId);
              }}
              onItemClick={(id) => navigate(`/profile/${id}/edit`)}
              loading={loading}
              emptyMessage={
                search
                  ? `No results for "${search}"`
                  : `No ${currentDomainLabel ?? 'items'} found`
              }
            />
          )}
        </ActionHandler>
      ) : (
        <MapView
          schema={filterSchemaByPrivacy(activeSchema!, 'public-only')}
          items={filteredItems}
          onMarkerClick={(id) => {
            navigate(`/profile/${id}/edit`);
          }}
        />
      )}
    </PageShell>
  );
}
