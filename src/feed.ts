import * as fs from 'fs-extra';
import { JSONStore } from '@quietmath/moneta';
import { blue, red } from 'chalk';
import { getFiles, getWriteFileName } from './file';
import { getTemplateData } from './helpers';
import { PubConfig, RSSConfig } from './schema';

export const createFeeds = (pos: number, config: PubConfig, store: JSONStore, filePaths: string[], hb: any): void => {
    const feedConfig: RSSConfig = config.output.feeds[pos];
    const tmpl: string = feedConfig.template;
    const maxItems: number = feedConfig.maxItems;
    const folder: string = feedConfig.folder;
    const categoryProperty: string = feedConfig.property;
    const key: string = feedConfig.key;
    const files: string[] | any[] = getFiles(store, feedConfig, filePaths);

    const tmplNameParts: string[] = tmpl.replace('.hbs', '.xml').split('/');
    const tmplName: string = tmplNameParts.pop();    
    
    fs.readFile(`${ config.prefix }/${ tmpl }`, (err: Error, data: Buffer): void => {
        if(err != null) {
            console.info(red(`Unable to open file ${ config.prefix }/${ tmpl }: ${ err }`));
        }
        else {
            const tmplData: string[] = [];
            files.slice(0, (maxItems !== undefined) ? maxItems : undefined).forEach((file: string | any): void => {
                const d: any = getTemplateData(file, config);
                if(categoryProperty == null) {
                    tmplData.push(d);
                }
                else if(d[categoryProperty] != null && d[categoryProperty].toLowerCase().indexOf(key) !== -1) {
                    tmplData.push(d);
                }
            });
            const template: any = hb.compile(data.toString('utf-8'), { });
            const output: string = template({
                posts: tmplData,
                ...config.globals,
                _publisher: {
                    files: files,
                    store: store,
                    config: config
                }
            });
            console.info(blue(`Writing to file ${ config.prefix }/${ config.dest }/${ tmplName }`));
            const writeFileName: string = getWriteFileName(config, tmplName, folder);
            fs.writeFile(`${ config.prefix }/${ config.dest }/${ writeFileName }`, output, { encoding:'utf-8' })
                .then((): void => console.log(`Wrote partial to ${ `${ config.prefix }/${ config.dest }/${ tmplName }` }`))
                .catch((err): void => console.info(red(`Error writing partial: ${ err }`)));
        }
    });
};
