import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { DotNetworkDomain, ViewMode } from '@/engine/types';
import { TopBar } from './top-bar';
import { AppSidebar } from './sidebar';

interface PageShellProps {
  children: React.ReactNode;
  domains: DotNetworkDomain[];
  selectedDomain: string | null;
  onDomainSelect: (domainName: string | null) => void;
  currentDomainLabel?: string;
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function PageShell({
  children,
  domains,
  selectedDomain,
  onDomainSelect,
  currentDomainLabel,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: PageShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          domains={domains}
          selectedDomain={selectedDomain}
          onDomainSelect={onDomainSelect}
          currentDomainLabel={currentDomainLabel}
        />
        <div className="flex flex-1 flex-col">
          <TopBar
            search={search}
            onSearchChange={onSearchChange}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
