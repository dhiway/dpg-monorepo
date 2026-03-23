import { FastifyReply } from 'fastify';
import { apiConfig } from 'apps/api/src/config';

export function isServedDomainBinding(network: string, domain: string) {
  return apiConfig.served_domains.some(
    (binding) => binding.network === network && binding.domain === domain
  );
}

export function getServedDomainSummary() {
  const bindings = apiConfig.served_domains.map((binding) => binding.key);
  const networks = [...new Set(apiConfig.served_domains.map((b) => b.network))];
  const domains = [...new Set(apiConfig.served_domains.map((b) => b.domain))];

  return {
    bindings,
    networks,
    domains,
  };
}

export function replyForUnservedDomain(
  reply: FastifyReply,
  network: string,
  domain: string
) {
  const allowed = getServedDomainSummary();

  return reply.code(403).send({
    error: 'UNSERVED_DOMAIN_BINDING',
    message: `This API instance does not serve "${network}/${domain}".`,
    requested: {
      network,
      domain,
      key: `${network}/${domain}`,
    },
    allowed_bindings: allowed.bindings,
    allowed_networks: allowed.networks,
    allowed_domains: allowed.domains,
  });
}
