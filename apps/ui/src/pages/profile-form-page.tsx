import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { educationNetwork } from '../../../../packages/schemas/src/dot_examples/index';

// Referenced schemas — imported at build time, resolved at runtime via refMap
import studentProfileSchema from '../../../../packages/schemas/src/dot_examples/domain.json';
import learnerProfileSchema from '../../../../packages/schemas/src/dot_examples/learner_domain.json';
import tutorCounsellorProfileSchema from '../../../../packages/schemas/src/dot_examples/tutor_counsellor_domain.json';

const schemaRefMap: Record<string, unknown> = {
  './domain.json': studentProfileSchema,
  './learner_domain.json': learnerProfileSchema,
  './tutor_counsellor_domain.json': tutorCounsellorProfileSchema,
};

const domainIcons: Record<string, LucideIcon> = {
  student_profile: GraduationCap,
  learner_profile: GraduationCap,
  tutor_counsellor_profile: UserCheck,
  coaching_center: Building2,
};

export function ProfileFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [selectedDomain, setSelectedDomain] = React.useState<string | null>(null);
  const [resolvedNetwork, setResolvedNetwork] = React.useState<DotNetworkSchema | null>(null);

  // Eagerly resolve all $ref in network before rendering
  React.useEffect(() => {
    resolveNetworkRefs(educationNetwork, { refMap: schemaRefMap }).then((resolved) => {
      setResolvedNetwork(resolved as DotNetworkSchema);
    });
  }, []);

  const network = resolvedNetwork;
  const domains = network?.domains ?? [];

  // Find the profile schema for the selected domain
  const profileSchema = React.useMemo<RJSFSchema | null>(() => {
    if (!selectedDomain || !domains.length) return null;
    const domain = domains.find((d) => d.name === selectedDomain);
    return (domain?.default_item_schemas.profile ?? null) as RJSFSchema | null;
  }, [selectedDomain, domains]);

  const selectedDomainInfo = domains.find((d) => d.name === selectedDomain);

  if (!network) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading network schemas...</p>
      </div>
    );
  }

  const handleSubmit = (data: Record<string, unknown>) => {
    console.log('Profile data:', { domain: selectedDomain, data });
    toast.success(isEdit ? 'Profile updated!' : 'Profile created!');
    navigate('/');
  };

  // Domain selection step
  if (!selectedDomain && !isEdit) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <Button
            variant="ghost"
            className="mb-4 gap-2"
            onClick={() => navigate('/')}
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
          onClick={() => (selectedDomain ? setSelectedDomain(null) : navigate('/'))}
        >
          <ArrowLeft className="h-4 w-4" />
          {selectedDomain ? 'Choose different role' : 'Back'}
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
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
