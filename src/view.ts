import * as fs from 'fs-extra';
import { blue, red } from 'chalk';
import { JSONStore } from '@quietmath/moneta';
import { PubConfig, ViewConfig } from './schema';
import { getFiles } from './file';
import { getTemplateData } from './helpers';

export const createViews = (config: PubConfig, store: JSONStore, filePaths: string[], hb): void => {
    const viewConfig: ViewConfig = config.output.view;
    const templates: string[] = viewConfig.templates;
    const files: any[] | string[] = getFiles(store, config?.output?.view, filePaths);
    
    templates.forEach((tmpl: string): void => {
        fs.readFile(`${ config.prefix }/${ tmpl }`, (err: Error, tmplData: Buffer): void => {
            if(err != null) {
                console.info(red(`Unable to open file ${ config.prefix }/${ tmpl }: ${ err }`));
            }
            else {
                files.forEach(async (f: any | string): Promise<void> => {
                    const fileName: string = (typeof(f) === 'string') ? f : f.filePath;
                    console.info(`Publishing file ${ fileName }`);
                    const outputFile = `${ config.prefix }/${ config.dest }/${ fileName.replace(`${ config.prefix }/`,'')
                        .replace(`${ config.source }/`, '')
                        .replace('.md','.html') }`;
                    console.info(blue(`Current output file is ${ outputFile }`));
                    const outputDir = `${ outputFile.substr(0, outputFile.lastIndexOf('/')) }`;
                    await fs.ensureDir(outputDir);
                    const d: any = getTemplateData(f, config);
                    const template: any = hb.compile(tmplData.toString('utf-8'), { });
                    const output: string = template({
                        ...config.globals,
                        ...d,
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
                });
            }
        });
    });
};
