import { module } from '@prisma/composer';
import { compute, rawPostgres } from '@prisma/composer-prisma-cloud';
import node from '@prisma/composer/node';

const appService = compute({
  name: 'app',
  deps: {
    db: rawPostgres(),
  },
  build: node({
    module: import.meta.url,
    dir: './dist',
    entry: 'main.js',
    dependencies: 'external',
  }),
});

export default module('learningprisma', ({ provision }) => {
  provision(appService);
});
