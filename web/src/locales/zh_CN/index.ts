import about from './about';
import common from './common';
import currencies from './currencies';
import home from './home';
import rates from './rates';

const zhCN: Record<string, string> = {
  ...common,
  ...currencies,
  ...home,
  ...about,
  ...rates,
};

export default zhCN;
