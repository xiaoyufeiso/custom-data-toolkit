export const envConfig = {
  local: {
    host: '',
  },
  uat: {
    host: '',
  },
  pro: {
    host: '',
  },
};

const commonConfig = {
  auth: '/api/auth',
  apiVersion: 'v1',
};

type EnvType = keyof typeof envConfig;

const apiEnv = (import.meta.env.VITE_PUBLIC_APIENV || 'pro') as EnvType;

export const config = {
  ...commonConfig,
  ...envConfig[apiEnv],
};
