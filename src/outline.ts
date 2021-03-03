import * as fs from 'fs-extra';
import { red } from 'chalk';
import { s } from '@quietmath/proto';
import { Publisher } from './publisher';
import { addHashes } from './helpers';

const buildOutline = (pub: Publisher, arr: any): void => {
    arr.forEach((itm: any | string): void => {
        if(typeof(itm) !== 'string') {
            const key: string = Object.keys(itm)[0];
            addHashes(pub, key, -1);
            pub.summary += ` ${ s(key.replace(/_/ig, ' ')).capWords().toString() }\n\n`;
            buildOutline(pub, itm[key]);
        }
        else {
            const anchor: string = addHashes(pub, itm, 0);
            pub.summary += ` [${ s(itm.replace(/\.md/ig,'').replace(/_/ig,' ')).capWords().toString() }](${ anchor })\n\n`;
        }
    });
};

export const createOutline = (pub: Publisher): void => {
    pub.summary = '# Summary\n\n';
    const startKey: string = Object.keys(pub.tree[0]).find((e: string) => e === pub.config.source);
    buildOutline(pub, pub.tree[0][startKey]);
    fs.writeFile(`${ pub.config.prefix }/${ pub.config.source }/SUMMARY.md`, pub.summary, { encoding:'utf-8' })
        .then((): void => console.log(`Wrote summary file to ${ `${ pub.config.prefix }/${ pub.config.source }/SUMMARY.md` }`))
        .catch((err: any): void => console.info(red(`Error writing summary file: ${ err }`)));
};
