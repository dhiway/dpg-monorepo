export type NodeEnv = 'development' | 'production';

export interface NotificationClientInterface {
  notify<TVariables extends Record<string, unknown>>(
    payload: {
      channel: string;
      template_id: string;
      to: string;
      priority: 'realtime' | 'other';
      variables: TVariables;
    }
  ): Promise<void>;
}

export interface AuthRuntimeConfig {
  appName: string;
  nodeEnv: NodeEnv;

  baseURL: string;
  secret: string;

  apiDomain: string;

  trustedOrigins: string[];
  adminDomains: string[];
  db: DrizzleDatabase;
  redis: Redis;

  createTestOTP?: boolean;
  notificationClient?: NotificationClientInterface;
  smsTemplateId?: string;
}
