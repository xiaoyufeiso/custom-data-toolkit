import about from './about';
import common from './common';
import currencies from './currencies';
import customsDict from './customsDict';
import home from './home';
import rates from './rates';

const en: Record<string, string> = {
  ...common,
  ...currencies,
  ...customsDict,
  ...home,
  ...about,
  ...rates,
};

export default en;
