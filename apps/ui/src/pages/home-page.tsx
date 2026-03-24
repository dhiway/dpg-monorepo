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
import { fetchItems, type Item } from '@/lib/item-api';
import {
  educationNetwork,
} from '../../../../packages/schemas/src/dot_examples/index';

// Referenced schemas — imported at build time, resolved at runtime via refMap
import studentProfileSchema from '../../../../packages/schemas/src/dot_examples/domain.json';
import learnerProfileSchema from '../../../../packages/schemas/src/dot_examples/learner_domain.json';
import tutorCounsellorProfileSchema from '../../../../packages/schemas/src/dot_examples/tutor_counsellor_domain.json';

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
      item_type: 'profile',
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
    const domain = network.domains.find((d) => d.name === domainName);
    return domain?.default_item_schemas.profile ?? network.domains[0]?.default_item_schemas.profile;
  }, [network, selectedDomain, visibleDomains]);

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
          onActionSubmit={async (actionType, _actionSchema, formData) => {
            console.log('Connect action:', { actionType, formData });
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
              onAction={(_itemId, _type, actionSchema) => {
                triggerAction(_type, actionSchema);
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
