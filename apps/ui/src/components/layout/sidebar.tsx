import { useNavigate } from 'react-router-dom';
import type { RJSFSchema } from '@rjsf/utils';
import type { DotNetworkDomain, DotNetworkSchema } from '@/engine/types';
import type { Item } from '@/lib/item-api';
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { LayoutGrid, Box, Plus, Pencil, GraduationCap, UserCheck, Building2, Network } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AppSidebarProps {
  networks?: DotNetworkSchema[];
  selectedNetwork?: string | null;
  onNetworkSelect?: (networkName: string) => void;
  domains: DotNetworkDomain[];
  selectedDomain: string | null;
  onDomainSelect: (domainName: string | null) => void;
  currentDomainLabel?: string;
  myItems?: Item[];
  activeProfileId?: string | null;
  onActiveProfileChange?: (profileId: string) => void;
  userSchemas?: Record<string, RJSFSchema>;
}

const domainIcons: Record<string, LucideIcon> = {
  student: GraduationCap,
  tutor: UserCheck,
  coaching_center: Building2,
};

function findTitleField(schema: RJSFSchema): string | null {
  if (!schema.properties) return null;
  const candidates = ['name', 'full_name', 'title', 'provider_id', 'learner_id', 'student_id'];
  for (const key of candidates) {
    if (key in schema.properties) return key;
  }
  return Object.keys(schema.properties)[0] ?? null;
}

export function AppSidebar({
  networks = [],
  selectedNetwork,
  onNetworkSelect,
  domains,
  selectedDomain,
  onDomainSelect,
  currentDomainLabel,
  myItems = [],
  activeProfileId,
  onActiveProfileChange,
  userSchemas,
}: AppSidebarProps) {
  const navigate = useNavigate();

  const showNetworkSelector = networks.length > 0;

  return (
    <ShadcnSidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">
          {currentDomainLabel ?? 'Domains'}
        </h2>
      </SidebarHeader>
      <SidebarContent>
        {showNetworkSelector && (
          <SidebarGroup>
            <SidebarGroupLabel>Networks</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {networks.map((network) => (
                  <SidebarMenuItem key={network.name}>
                    <SidebarMenuButton
                      isActive={selectedNetwork === network.name}
                      onClick={() => onNetworkSelect?.(network.name)}
                    >
                      <Network className="h-4 w-4" />
                      <span>{network.display_name || network.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {showNetworkSelector && <SidebarSeparator />}
        <SidebarGroup>
          <SidebarGroupLabel>Browse</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={selectedDomain === null}
                  onClick={() => onDomainSelect(null)}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span>All</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {domains.map((domain) => {
                const Icon = domainIcons[domain.name] ?? Box;
                return (
                  <SidebarMenuItem key={domain.name}>
                    <SidebarMenuButton
                      isActive={selectedDomain === domain.name}
                      onClick={() => onDomainSelect(domain.name)}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{domain.description}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>My Profile(s)</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {myItems.map((profile) => {
                const schema = userSchemas?.[profile.item_domain];
                const titleKey = schema ? findTitleField(schema) : null;
                const title = titleKey
                  ? String(profile.item_state[titleKey] ?? 'Profile')
                  : 'Profile';
                const Icon = domainIcons[profile.item_domain] ?? Box;
                const isActiveProfile = profile.item_id === activeProfileId;

                return (
                  <SidebarMenuItem key={profile.item_id}>
                    <SidebarMenuButton
                      isActive={isActiveProfile}
                      onClick={() => onActiveProfileChange?.(profile.item_id)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="truncate">{title}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      onClick={() => navigate(`/profile/${profile.item_id}/edit`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate('/profile/new')}>
                  <Plus className="h-4 w-4" />
                  <span>Create Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </ShadcnSidebar>
  );
}
