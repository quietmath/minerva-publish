import * as fs from 'fs-extra';
import { JSONStore } from '@quietmath/moneta';
import { blue, red } from 'chalk';
import { getFiles, getWriteFileName } from './file';
import { getTemplateData } from './helpers';
import { PubConfig, RSSConfig } from './schema';

export const createFeeds = (pos: number, config: PubConfig, store: JSONStore, filePaths: string[], hb: any): void => {
    const feedConfig: RSSConfig = config.output.feeds[pos];
    const tmpl = feedConfig.template;
    const maxItems = feedConfig.maxItems;
    const folder: string = feedConfig.folder;
    const categoryProperty = feedConfig.property;
    const key = feedConfig.key;
    const tmplNameParts = tmpl.replace('.hbs', '.xml').split('/');
    const tmplName = tmplNameParts.pop();
    console.info(blue(`Current template name is ${ tmplName }`));
    console.info(blue(`Current template to read is ${ config.prefix }/${ tmpl }`));
    const files: string[] | any[] = getFiles(store, feedConfig, filePaths);
    fs.readFile(`${ config.prefix }/${ tmpl }`, (err: Error, data: Buffer) => {
        if(err != null) {
            console.info(red(`Unable to open file ${ config.prefix }/${ tmpl }: ${ err }`));
        }
        else {
            const tmplData = [];
            files.slice(0, (maxItems !== undefined) ? maxItems : undefined).forEach((file: string | any) => {
                const d = getTemplateData(file, config);
                if(categoryProperty == null) {
                    tmplData.push(d);
                }
                else if(d[categoryProperty] != null && d[categoryProperty].toLowerCase().indexOf(key) !== -1) {
                    tmplData.push(d);
                }
            });
            console.info(blue(`Current handlebar layout is ${ config.prefix }/${ config.layout }`));
            const template = hb.compile(data.toString('utf-8'), { });
            const output = template({
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
                .then(() => console.log(`Wrote partial to ${ `${ config.prefix }/${ config.dest }/${ tmplName }` }`))
                .catch((err) => console.info(red(`Error writing partial: ${ err }`)));
        }
    });
};
