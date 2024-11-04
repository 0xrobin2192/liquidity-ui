#!/usr/bin/env yarn ts-node

import { doAllPriceUpdates } from '../cypress/tasks/doAllPriceUpdates';
const [address] = process.argv.slice(2);
doAllPriceUpdates({ address }).then((data) => console.log(JSON.stringify(data, null, 2)));
