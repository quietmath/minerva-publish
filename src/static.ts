import * as fs from 'fs-extra';
import { JSONStore } from '@quietmath/moneta';
import { blue, red } from 'chalk';
import { PubConfig, StaticConfig } from './schema';

export const createStaticFiles = (config: PubConfig, store: JSONStore, files: string[], hb: any): void => {
    const staticConfig: StaticConfig = config.output.static;
    const templates: string[] = staticConfig.templates;
    templates.forEach((tmpl: string): void => {
        fs.readFile(`${ config.prefix }/${ tmpl }`, (err: Error, tmplData: Buffer): void => {
            const fileName: string = tmpl.split('/').reverse()[0].replace('.hbs', '.html');
            if(err != null) {
                console.info(red(`Unable to open file ${ config.prefix }/${ tmpl }: ${ err }`));
            }
            else {
                const outputFile = `${ config.prefix }/${ config.dest }/${ fileName }`;
                console.info(blue(`Current output file is ${ outputFile }`));
                const html: string = tmplData.toString('utf-8');
                const template: any = hb.compile(html, { });
                const output: string = template({
                    ...config.globals,
                    ...{ content: html },
                    _publisher: {
                        files: files,
                        store: store,
                        config: config
                    }
                });
                fs.writeFile(`${ outputFile }`, output, (e: any): void => {
                    if(e != null) {
                        console.info(red(`Failed to write file ${ e }`));
                    }
                });
            }
        });
    });
};
