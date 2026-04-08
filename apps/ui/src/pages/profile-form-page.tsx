import * as React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, GraduationCap, UserCheck, Building2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RJSFSchema } from '@rjsf/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SchemaForm } from '@/components/forms/schema-form';
import { resolveNetworkRefs } from '@/engine/schema/resolve-schema';
import type { DotNetworkSchema } from '@/engine/types';

import {
  createItem,
  fetchItems,
  updateItem,
  type CreateItemPayload,
  type UpdateItemPayload,
  type Item,
} from '@/lib/item-api';
import { fetchNetworkConfig } from '@/lib/network-api';
import { extractAndGeocode } from '@/lib/item-utils';
import { apiConfig } from '@/lib/api-config';

function parseNetworkNames(networkEnv: string | undefined): string[] {
  if (!networkEnv) return [];
  return networkEnv.split(',').map(n => n.trim()).filter(Boolean);
}

const domainIcons: Record<string, LucideIcon> = {
  student_profile: GraduationCap,
  learner_profile: GraduationCap,
  tutor_counsellor_profile: UserCheck,
  coaching_center: Building2,
};

export function ProfileFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;

  const [selectedDomain, setSelectedDomain] = React.useState<string | null>(null);
  const [resolvedNetwork, setResolvedNetwork] = React.useState<DotNetworkSchema | null>(null);
  const [existingItem, setExistingItem] = React.useState<Item | null>(null);
  const [initialData, setInitialData] = React.useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(isEdit);

  // Get network from URL query param, fallback to env config
  const configuredNetworkNames = parseNetworkNames(import.meta.env.VITE_NETWORK_NAME);
  const networkFromUrl = searchParams.get('network');
  const targetNetworkName = networkFromUrl && configuredNetworkNames.includes(networkFromUrl)
    ? networkFromUrl
    : (configuredNetworkNames[0] || 'yellow_dot');

  // Fetch and resolve network config from API
  React.useEffect(() => {
    const controller = new AbortController();

    fetchNetworkConfig(targetNetworkName)
      .then((config) => {
        if (controller.signal.aborted) return;
        return resolveNetworkRefs(config, { baseUrl: apiConfig.getUrl() });
      })
      .then((resolved) => {
        if (controller.signal.aborted || !resolved) return;
        setResolvedNetwork(resolved as DotNetworkSchema);
      })
      .catch((err) => {
        console.error('Failed to fetch network config:', err);
      });

    return () => { controller.abort(); };
  }, [targetNetworkName]);

  // Fetch existing profile for edit mode
  React.useEffect(() => {
    if (!isEdit || !id || !resolvedNetwork) return;

    let cancelled = false;

    const loadExistingProfile = async () => {
      try {
        // Search across all domains to find the item
        for (const domain of resolvedNetwork.domains ?? []) {
          const itemTypeKeys = domain.item_schemas ? Object.keys(domain.item_schemas) : [];
          const itemType = itemTypeKeys.length > 0 ? itemTypeKeys[0] : 'profile';

          const response = await fetchItems({
            item_network: resolvedNetwork.name,
            item_domain: domain.name,
            item_type: itemType,
            item_id: id,
            limit: 1,
          });

          if (response.items.length > 0) {
            if (cancelled) return;
            const item = response.items[0];
            setExistingItem(item);
            setSelectedDomain(item.item_domain);
            setInitialData(item.item_state);
            break;
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load profile:', err);
          toast.error('Failed to load profile');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadExistingProfile();
    return () => { cancelled = true; };
  }, [isEdit, id, resolvedNetwork]);

  const network = resolvedNetwork;
  const domains = network?.domains ?? [];

  // Find the profile schema for the selected domain
  const profileSchema = React.useMemo<RJSFSchema | null>(() => {
    if (!selectedDomain || !domains.length) return null;
    const domain = domains.find((d) => d.name === selectedDomain);
    return domain?.item_schemas ? Object.values(domain.item_schemas)[0] : null;
  }, [selectedDomain, domains]);

  // Get the default item type name from domain config (e.g., "profile_1.0")
  const defaultItemType = React.useMemo<string | null>(() => {
    if (!selectedDomain || !domains.length) return null;
    const domain = domains.find((d) => d.name === selectedDomain);
    const itemTypeKeys = domain?.item_schemas ? Object.keys(domain.item_schemas) : [];
    return itemTypeKeys.length > 0 ? itemTypeKeys[0] : null;
  }, [selectedDomain, domains]);

  const selectedDomainInfo = domains.find((d) => d.name === selectedDomain);

  // Get network-level instance URL and schema URL for the selected domain
  const domainInstance = React.useMemo(() => {
    if (!selectedDomain || !network) return null;
    return network.instances?.find((i) => i.domain_name === selectedDomain) ?? null;
  }, [selectedDomain, network]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!selectedDomain || !network) return;

    setIsSubmitting(true);

    try {
      // Geocode from domain-specific pincode field
      const { coordinates } = await extractAndGeocode(data, selectedDomain);

      if (isEdit && existingItem) {
        // Update existing profile
        const updatePayload: UpdateItemPayload = {
          item_state: data,
        };

        if (coordinates) {
          updatePayload.item_latitude = coordinates.lat;
          updatePayload.item_longitude = coordinates.lng;
        }

        await updateItem(existingItem.item_id, updatePayload);
        toast.success('Profile updated!');
      } else {
        // Create new profile
        const createPayload: CreateItemPayload = {
          item_network: network.name,
          item_domain: selectedDomain,
          item_type: defaultItemType ?? 'profile',
          item_state: data,
        };

        if (domainInstance?.instance_url) {
          createPayload.item_instance_url = domainInstance.instance_url;
        }

        const customSchemaUrls = domainInstance?.custom_item_schema_urls as Record<string, string> | undefined;
        if (defaultItemType && customSchemaUrls?.[defaultItemType]) {
          createPayload.item_schema_url = customSchemaUrls[defaultItemType];
        }

        if (coordinates) {
          createPayload.item_latitude = coordinates.lat;
          createPayload.item_longitude = coordinates.lng;
        }

        const result = await createItem(createPayload);
        toast.success('Profile created!', { description: `ID: ${result.item_id}` });
      }

      navigate(`/?network=${resolvedNetwork?.name ?? ''}`);
    } catch (err: unknown) {
      console.error('Failed to save profile:', err);

      const axiosError = err as { response?: { status?: number; data?: { error?: string; message?: string } } };
      const status = axiosError?.response?.status;
      const error = axiosError?.response?.data;

      if (status === 403 && error?.error === 'UNSERVED_DOMAIN_BINDING') {
        toast.error('Domain not served by this API instance', {
          description: error.message,
        });
      } else if (status === 409) {
        toast.error('Profile already exists', {
          description: 'A profile with this combination already exists',
        });
      } else {
        toast.error(isEdit ? 'Failed to update profile' : 'Failed to create profile', {
          description: error?.message ?? 'Something went wrong',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!network || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">
          {isLoading ? 'Loading profile...' : 'Loading network schemas...'}
        </p>
      </div>
    );
  }

  // Domain selection step
  if (!selectedDomain && !isEdit) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <Button
            variant="ghost"
            className="mb-4 gap-2"
            onClick={() => navigate(`/?network=${targetNetworkName}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Create Profile</h1>
            <p className="text-muted-foreground mt-1">
              Choose your role on the network
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {domains.map((domain) => {
              const Icon = domainIcons[domain.name] ?? GraduationCap;
              return (
                <Card
                  key={domain.name}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedDomain(domain.name)}
                >
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg capitalize">
                      {domain.name.replace(/_/g, ' ')}
                    </CardTitle>
                    <CardDescription>{domain.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <Button
          variant="ghost"
          className="mb-4 gap-2"
          onClick={() => (selectedDomain && !isEdit ? setSelectedDomain(null) : navigate(`/?network=${resolvedNetwork?.name ?? ''}`))}
        >
          <ArrowLeft className="h-4 w-4" />
          {selectedDomain && !isEdit ? 'Choose different role' : 'Back'}
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>
              {isEdit ? 'Edit Profile' : `Create ${selectedDomainInfo?.description ?? 'Profile'}`}
            </CardTitle>
            <CardDescription>
              {selectedDomainInfo?.description ?? 'Fill in your profile details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profileSchema && (
              <SchemaForm
                schema={profileSchema}
                onSubmit={handleSubmit}
                disabled={isSubmitting}
                formData={initialData ?? undefined}
                submitButtonText={isEdit ? 'Update' : undefined}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
