import { useNavigate } from 'react-router-dom';
import type { DotNetworkDomain } from '@/engine/types';
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { LayoutGrid, Box, Plus, GraduationCap, UserCheck, Building2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppSidebarProps {
  domains: DotNetworkDomain[];
  selectedDomain: string | null;
  onDomainSelect: (domainName: string | null) => void;
  currentDomainLabel?: string;
}

const domainIcons: Record<string, LucideIcon> = {
  student: GraduationCap,
  tutor: UserCheck,
  coaching_center: Building2,
};

export function AppSidebar({
  domains,
  selectedDomain,
  onDomainSelect,
  currentDomainLabel,
}: AppSidebarProps) {
  const navigate = useNavigate();

  return (
    <ShadcnSidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">
          {currentDomainLabel ?? 'Domains'}
        </h2>
      </SidebarHeader>
      <SidebarContent>
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
      </SidebarContent>
      <SidebarFooter className="border-t p-3">
        <Button
          className="w-full"
          onClick={() => navigate('/profile/new')}
        >
          <Plus className="h-4 w-4" />
          Create Profile
        </Button>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
