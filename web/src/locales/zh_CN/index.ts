import about from './about';
import adminUsers from './adminUsers';
import auditLogs from './auditLogs';
import auth from './auth';
import common from './common';
import currencies from './currencies';
import customsDict from './customsDict';
import home from './home';
import rates from './rates';

const zhCN: Record<string, string> = {
  ...common,
  ...adminUsers,
  ...auditLogs,
  ...auth,
  ...currencies,
  ...customsDict,
  ...home,
  ...about,
  ...rates,
};

export default zhCN;
