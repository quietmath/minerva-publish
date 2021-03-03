import * as fs from 'fs-extra';
import { JSONStore } from '@quietmath/moneta';
import { range } from '@quietmath/proto';
import { blue, red } from 'chalk';
import { getFiles, getWriteFileName } from './file';
import { getTemplateData } from './helpers';
import { PubConfig, ListConfig } from './schema';

export const createLists = (pos: number, config: PubConfig, store: JSONStore, filePaths: string[], hb: any): void => {
    const listConfig: ListConfig = config.output.lists[pos];
    const pagingTemplate: string = listConfig.paging;
    const pagingFolder: string = listConfig.folder;
    const pageSize: number = (listConfig.size != null) ? listConfig.size : 10;
    const skipPages: number = (listConfig.skip != null) ? listConfig.skip : 0;
    const categoryProperty: string = listConfig.property;
    const key: string = listConfig.key;
    const templates: string[] = listConfig.templates;
    const files: string[] | any[] = getFiles(store, listConfig, filePaths);
    templates.forEach((tmpl: string): void => {
        const tmplNameParts: string[] = tmpl.replace('.hbs', '.html').split('/');
        const tmplName: string = tmplNameParts.pop();
        fs.readFile(`${ config.prefix }/${ tmpl }`, (err: Error, data: Buffer): void => {
            let fileSlice: string[] | any[] = files.slice(skipPages);
            if(categoryProperty != null) {
                fileSlice = fileSlice.filter((e: any) => e.data[categoryProperty] != null && e.data[categoryProperty].toLowerCase().indexOf(key) !== -1);
            }
            let totalPages: number = Math.ceil(fileSlice.length / pageSize);
            if(tmpl != pagingTemplate) {
                totalPages = 1;
            }
            range(totalPages).forEach((num: number): void => {
                if(err != null) {
                    console.info(red(`Unable to open file ${ config.prefix }/${ tmpl }: ${ err }`));
                }
                else {
                    const tmplData: any[] = [];
                    const start: number = (num -1) * pageSize;
                    const end: number = start + pageSize;
                    const currentFiles: string[] = fileSlice.slice(start, end);
                    currentFiles.forEach((file: string | any): void => {
                        const d: any = getTemplateData(file, config);
                        tmplData.push(d);
                    });
                    
                    const template: any = hb.compile(data.toString('utf-8'), { });
                    const pagingLinks: any = {
                        nextPage: ((num + 1 == totalPages) ? undefined : num + 1),
                        prevPage: ((num - 1 == 0) ? undefined : (num - 1)),
                        pagingFolder: pagingFolder
                    };
                    const output: string = template({
                        posts: tmplData,
                        ...pagingLinks,
                        _publisher: {
                            files: filePaths,
                            store: store,
                            config:
                            config
                        }
                    });
                    let writeFileName: string;
                    if(totalPages === 1) {
                        writeFileName = getWriteFileName(config, tmplName, pagingFolder);
                    }
                    else {
                        writeFileName = getWriteFileName(config, `${ num }.html`, pagingFolder);
                    }
                    console.info(blue(`Writing to file ${ config.prefix }/${ config.dest }/${ writeFileName }`));
                    fs.writeFile(`${ config.prefix }/${ config.dest }/${ writeFileName }`, output, { encoding:'utf-8' })
                        .then((): void => console.log(`Wrote partial to ${ `${ config.prefix }/${ config.dest }/${ writeFileName }` }`))
                        .catch((err: any): void => console.info(red(`Error writing partial: ${ err }`)));
                }
            });
        });
    });
};
