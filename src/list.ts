import * as fs from 'fs-extra';
import { JSONStore } from '@quietmath/moneta';
import { range } from '@quietmath/proto';
import { blue, red } from 'chalk';
import { getFiles, getWriteFileName } from './file';
import { getTemplateData } from './helpers';
import { PubConfig, ListConfig } from './schema';

export const createListFiles = (pos: number, config: PubConfig, store: JSONStore, filePaths: string[], hb: any): void => {
    const listConfig: ListConfig = config.output.lists[pos];
    const pagingTemplate: string = listConfig.paging;
    const pagingFolder: string = listConfig.folder;
    const pageSize: number = (listConfig.size != null) ? listConfig.size : 10;
    const skipPages: number = (listConfig.skip != null) ? listConfig.skip : 0;
    const categoryProperty = listConfig.property;
    const key = listConfig.key;
    console.info(blue(`Current page size is ${ pageSize }`));
    const templates = listConfig.templates;
    console.info(blue(`Current list templates are ${ templates }`));
    const files: string[] | any[] = getFiles(store, listConfig, filePaths);    
    console.info(blue(`Current number of markdown files are ${ files.length }`));
    templates.forEach((tmpl: string) => {
        const tmplNameParts = tmpl.replace('.hbs', '.html').split('/');
        const tmplName = tmplNameParts.pop();
        console.info(blue(`Current template name is ${ tmplName }`));
        console.info(blue(`Current file to read is ${ config.prefix }/${ tmpl }`));
        fs.readFile(`${ config.prefix }/${ tmpl }`, (err: Error, data: Buffer) => {
            let fileSlice = files.slice(skipPages);
            if(categoryProperty != null) {
                fileSlice = fileSlice.filter((e: any) => e.data[categoryProperty] != null && e.data[categoryProperty].toLowerCase().indexOf(key) !== -1);
            }
            let totalPages = Math.ceil(fileSlice.length / pageSize);
            if(tmpl != pagingTemplate) {
                totalPages = 1;
            }
            range(totalPages).forEach((num: number) => {
                if(err != null) {
                    console.info(red(`Unable to open file ${ config.prefix }/${ tmpl }: ${ err }`));
                }
                else {
                    const tmplData = [];
                    const start = (num -1) * pageSize;
                    const end = start + pageSize;
                    const currentFiles: string[] = fileSlice.slice(start, end);
                    currentFiles.forEach((file: string | any) => {
                        const d = getTemplateData(file, config);
                        tmplData.push(d);
                    });
                    console.info(blue(`Current handlebar layout is ${ config.prefix }/${ config.layout }`));
                    const template = hb.compile(data.toString('utf-8'), { });
                    const pagingLinks = {
                        nextPage: ((num + 1 == totalPages) ? undefined : num + 1),
                        prevPage: ((num - 1 == 0) ? undefined : (num - 1)),
                        pagingFolder: pagingFolder
                    };
                    const output = template({
                        posts: tmplData,
                        ...pagingLinks,
                        _publisher: {
                            files: filePaths,
                            store: store,
                            config:
                            config
                        }
                    });
                    console.info(blue(`Writing to file ${ config.prefix }/${ config.dest }/${ tmplName }`));
                    let writeFileName: string;
                    if(totalPages === 1) {
                        writeFileName = getWriteFileName(config, tmplName, pagingFolder);
                    }
                    else {
                        writeFileName = getWriteFileName(config, `${ num }.html`, pagingFolder);
                    }
                    fs.writeFile(`${ config.prefix }/${ config.dest }/${ writeFileName }`, output, { encoding:'utf-8' })
                        .then(() => console.log(`Wrote partial to ${ `${ config.prefix }/${ config.dest }/${ writeFileName }` }`))
                        .catch((err) => console.info(red(`Error writing partial: ${ err }`)));
                }
            });
        });
    });
};
