import about from './about';
import common from './common';
import home from './home';

const en: Record<string, string> = {
  ...common,
  ...home,
  ...about,
};

export default en;
