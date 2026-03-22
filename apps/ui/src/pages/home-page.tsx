import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import type {
  DotNetworkSchema,
  DotActionSchema,
  ViewMode,
} from '@/engine/types';
import { filterSchemaByPrivacy } from '@/engine/schema/schema-privacy';
import { resolveNetworkRefs } from '@/engine/schema/resolve-schema';
import { registerMapProvider } from '@/engine/map/map-registry';
import { PageShell } from '@/components/layout/page-shell';
import { CardGrid } from '@/components/cards/card-grid';
import { ActionHandler } from '@/components/actions/action-handler';
import { MapView } from '@/components/map/map-container';
import { LeafletMapProvider } from '@/components/map/leaflet-provider';
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

// Register default map provider
registerMapProvider({
  name: 'leaflet',
  component: LeafletMapProvider,
});

// Demo data — in production this comes from API
const DEMO_ITEMS: Record<string, Array<{ id: string; data: Record<string, unknown> }>> = {
  student_profile: [
    { id: 'stu-001', data: { student_id: 'STU-2026-001', full_name: 'Aarav Sharma', grade: '11', email: 'aarav@student.example.com', date_of_birth: '2010-08-14' } },
    { id: 'stu-002', data: { student_id: 'STU-2026-002', full_name: 'Priya Patel', grade: '12', email: 'priya@student.example.com', date_of_birth: '2009-03-22' } },
    { id: 'stu-003', data: { student_id: 'STU-2026-003', full_name: 'Rohan Verma', grade: '10', email: 'rohan@student.example.com', date_of_birth: '2011-01-05' } },
  ],
  learner_profile: [
    { id: 'lrn-001', data: { learner_id: 'LRN-2026-001', pincode: '560001', grade_band: 'Class XI', capability_band: 'Mid', academic_stream: 'Science', service_type: 'Tutoring', subject_or_domain: 'Physics' } },
    { id: 'lrn-002', data: { learner_id: 'LRN-2026-002', pincode: '110001', grade_band: 'Class XII', capability_band: 'High', academic_stream: 'Commerce', service_type: 'Career Guidance', subject_or_domain: 'Admissions' } },
    { id: 'lrn-003', data: { learner_id: 'LRN-2026-003', pincode: '400001', grade_band: 'Post-XII', capability_band: 'Low', academic_stream: 'Arts', service_type: 'Skill Workshop', subject_or_domain: 'Creative Writing' } },
  ],
  tutor_counsellor_profile: [
    { id: 'tut-001', data: { provider_id: 'PRV-2026-001', pincode: '560001', coverage_radius_km: 10, provider_type: 'Tutor', domain_specialisations: ['Mathematics', 'Physics'], credentials: [{ credential_type: 'Certified Tutor', issuing_body: 'CBSE Board' }], target_grade_band: 'Class XI', target_subject_area: 'Physics', target_capability_tier: 'Any', service_mode: 'Hybrid', session_structure: 'Regular' } },
    { id: 'tut-002', data: { provider_id: 'PRV-2026-002', pincode: '110001', coverage_radius_km: 15, provider_type: 'Career Counsellor', domain_specialisations: ['College Admissions', 'Career Guidance'], credentials: [{ credential_type: 'Licensed Counsellor', issuing_body: 'NCERT' }], target_grade_band: 'Post-XII', target_subject_area: 'Admissions', target_capability_tier: 'High', service_mode: 'Online', session_structure: 'Topic Based' } },
    { id: 'tut-003', data: { provider_id: 'PRV-2026-003', pincode: '400001', coverage_radius_km: 20, provider_type: 'Tutor', domain_specialisations: ['Chemistry', 'Biology'], credentials: [], target_grade_band: 'Class XII', target_subject_area: 'Chemistry', target_capability_tier: 'Mid', service_mode: 'In-person', session_structure: 'Regular' } },
  ],
  coaching_center: [
    { id: 'cc-001', data: { name: 'Allen Career Institute', city: 'Kota', programs: ['JEE', 'NEET'], seats_available: 200 } },
    { id: 'cc-002', data: { name: 'FIITJEE South', city: 'Chennai', programs: ['JEE', 'Olympiad'], seats_available: 150 } },
  ],
};

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = React.useState('');
  const [viewMode, setViewMode] = React.useState<ViewMode>(
    (searchParams.get('view') as ViewMode) ?? 'list'
  );
  const [selectedDomain, setSelectedDomain] = React.useState<string | null>(
    searchParams.get('domain')
  );
  const [resolvedNetwork, setResolvedNetwork] = React.useState<DotNetworkSchema | null>(null);

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

  // Active schema: from the selected browsing domain, or first visible domain
  const activeSchema = React.useMemo(() => {
    if (!network) return undefined;
    const domainName = selectedDomain ?? visibleDomains[0]?.name;
    const domain = network.domains.find((d) => d.name === domainName);
    return domain?.default_item_schemas.profile ?? network.domains[0]?.default_item_schemas.profile;
  }, [network, selectedDomain, visibleDomains]);

  // Active items: demo data keyed by the browsing domain
  const activeItems = React.useMemo(() => {
    const domainName = selectedDomain ?? visibleDomains[0]?.name;
    return DEMO_ITEMS[domainName] ?? [];
  }, [selectedDomain, visibleDomains]);

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
    if (!search) return activeItems;
    const lower = search.toLowerCase();
    return activeItems.filter((item) =>
      Object.values(item.data).some((val) =>
        String(val).toLowerCase().includes(lower)
      )
    );
  }, [activeItems, search]);

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
              loading={false}
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
            toast.info(`Selected: ${id}`);
          }}
        />
      )}
    </PageShell>
  );
}
