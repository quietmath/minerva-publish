import * as fs from 'fs-extra';
import { red } from 'chalk';
import { Converter } from 'showdown';
import { JSONStore } from '@quietmath/moneta';
import { getMarkdownConverter } from './helpers';
import { PubConfig } from './schema';

export const createTOC = (config: PubConfig, files: string[], store: JSONStore, hb: any): void => {
    fs.readFile(`${ config.prefix }/${ config.source }/SUMMARY.md`, (err: Error, data: Buffer): void => {
        if(err != null) {
            console.info(red(`Unable to open file ${ config.prefix }/${ config.source }/SUMMARY.md: ${ err }`));
        }
        else {
            let md: string = data.toString('utf-8');
            md = md.replace(/\.md/ig, '.html');
            const c: Converter = getMarkdownConverter();
            const html: string = c.makeHtml(md);
            const template: any = hb.compile(html);
            const output: string = template({
                _publisher: {
                    files: files,
                    store: store,
                    config: config
                }
            });
            fs.writeFile(`${ config.prefix }/${ config.dest }/TOC.html`, output, { encoding:'utf-8' })
                .then((): void => console.log(`Wrote TOC file to ${ `${ config.prefix }/${ config.dest }/TOC.html` }`))
                .catch((err: any): void => console.info(red(`Error writing TOC: ${ err }`)));
        }
    });
};
