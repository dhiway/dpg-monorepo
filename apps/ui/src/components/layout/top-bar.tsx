import { useNavigate } from 'react-router-dom';
import { Search, List, Map, LogIn, Server } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/user-menu';
import { useAuth } from '@/contexts/auth-context';
import { apiConfig } from '@/lib/api-config';
import type { ViewMode } from '@/engine/types';

interface TopBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function TopBar({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: TopBarProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="pl-8"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) onViewModeChange(value as ViewMode);
          }}
        >
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="map" aria-label="Map view">
            <Map className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        {apiConfig.isDevMode() && (
          <Select
            value={apiConfig.getSelectedKey() ?? 'default'}
            onValueChange={(value) => apiConfig.setSelectedKey(value)}
          >
            <SelectTrigger className="w-[180px]" aria-label="Select API instance">
              <Server className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select API" />
            </SelectTrigger>
            <SelectContent>
              {apiConfig.getEndpoints().map((ep) => (
                <SelectItem key={ep.key} value={ep.key}>
                  {ep.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {!isLoading && (
          isAuthenticated ? (
            <UserMenu />
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/auth/login')}
              className="gap-2"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Login</span>
            </Button>
          )
        )}
      </div>
    </header>
  );
}
