import adminUsers from './adminUsers';
import auditLogs from './auditLogs';
import auth from './auth';
import common from './common';
import currencies from './currencies';
import customsDict from './customsDict';
import rates from './rates';

const en: Record<string, string> = {
  ...common,
  ...adminUsers,
  ...auditLogs,
  ...auth,
  ...currencies,
  ...customsDict,
  ...rates,
};

export default en;
