/* eslint-disable no-inner-declarations */
import * as fs from 'fs-extra';
import * as hb from 'handlebars';
import { blue, red } from 'chalk';
import { JSONStore } from '@quietmath/moneta';
import { PubConfig, StaticConfig, ViewConfig } from './schema';
import { buildFileTree, getFiles, getFilesFromDisc, storeFiles } from './file';
import { registerAllPartials, registerAllHelpers, registerExternalHelpers } from './handlebars';
import { buildOutline, getTemplateData, getMarkdownConverter } from './helpers';
import { createListFiles } from './list';
import { createFeeds } from './feed';
import { Converter } from 'showdown';

/**
 * @module quietmath/minerva-publish
 */

export class Publisher {
    public files: string[];
    private store: JSONStore;
    private tree: any;
    public summary: string;
    public config: PubConfig;
    constructor(config: PubConfig) {
        this.config = config;
        if(this.config.prefix === undefined) {
            this.config.prefix = process.cwd();
        }           
        registerAllPartials(hb, this.config);
        registerAllHelpers(hb);
        if(this.config.helpers) {
            registerExternalHelpers(hb, this.config);
        }
    }
    public async sanity(): Promise<void> {
        console.log('Performing sanity check.');
        if(this.tree == null) {
            this.files = await getFilesFromDisc(this.config);
            this.store = storeFiles(this.files, this.config?.output?.lists);
            this.tree = buildFileTree(this.files);
        }
    }
    public clean(): void {
        console.info(blue(`Cleaning ${ this.config.prefix }/${ this.config.dest }`));
        fs.emptyDirSync(`${ this.config.prefix }/${ this.config.dest }`);
    }
    public outline(): void {
        if(this.config?.output?.outline) {
            this.summary = '# Summary\n\n';
            const startKey: string = Object.keys(this.tree[0]).find((e: string) => e === this.config.source);
            buildOutline(this, this.tree[0][startKey]);
            fs.writeFile(`${ this.config.prefix }/${ this.config.source }/SUMMARY.md`, this.summary, { encoding:'utf-8' })
                .then((): void => console.log(`Wrote summary file to ${ `${ this.config.prefix }/${ this.config.source }/SUMMARY.md` }`))
                .catch((err: any): void => console.info(red(`Error writing summary file: ${ err }`)));
        }
    }
    public feeds(): void {
        if(this.config?.output?.feeds) {
            for(let i = 0; i < this.config.output.feeds.length; i++) {
                createFeeds(i, this.config, this.store, this.files, hb);
            }
        }
    }
    public lists(): void {
        if(this.config?.output?.lists) {
            for(let i = 0; i < this.config.output.lists.length; i++) {
                createListFiles(i, this.config, this.store, this.files, hb);
            }
        }
    }
    public toc(): void {
        const outline: boolean = this.config?.output?.outline;
        if(outline) {
            fs.readFile(`${ this.config.prefix }/${ this.config.source }/SUMMARY.md`, (err: Error, data: Buffer): void => {
                if(err != null) {
                    console.info(red(`Unable to open file ${ this.config.prefix }/${ this.config.source }/SUMMARY.md: ${ err }`));
                }
                else {
                    let md: string = data.toString('utf-8');
                    md = md.replace(/\.md/ig, '.html');
                    const c: Converter = getMarkdownConverter();
                    const html: string = c.makeHtml(md);
                    const template: any = hb.compile(html);
                    const output: string = template({
                        _publisher: {
                            files: this.files,
                            store: this.store,
                            config: this.config
                        }
                    });
                    fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/TOC.html`, output, { encoding:'utf-8' })
                        .then((): void => console.log(`Wrote TOC file to ${ `${ this.config.prefix }/${ this.config.dest }/TOC.html` }`))
                        .catch((err: any): void => console.info(red(`Error writing TOC: ${ err }`)));
                }
            });
        }
    }
    public view(): void {
        if(this.config?.output?.view) {
            const viewConfig: ViewConfig = this.config.output.view;
            const templates: string[] = viewConfig.templates;
            const files: any[] | string[] = getFiles(this.store, this.config?.output?.view, this.files);
            
            templates.forEach((tmpl: string): void => {
                fs.readFile(`${ this.config.prefix }/${ tmpl }`, (err: Error, tmplData: Buffer): void => {
                    if(err != null) {
                        console.info(red(`Unable to open file ${ this.config.prefix }/${ tmpl }: ${ err }`));
                    }
                    else {
                        files.forEach(async (f: any | string): Promise<void> => {
                            const fileName: string = (typeof(f) === 'string') ? f : f.filePath;
                            console.info(`Publishing file ${ fileName }`);
                            const outputFile = `${ this.config.prefix }/${ this.config.dest }/${ fileName.replace(`${ this.config.prefix }/`,'')
                                .replace(`${ this.config.source }/`, '')
                                .replace('.md','.html') }`;
                            console.info(blue(`Current output file is ${ outputFile }`));
                            const outputDir = `${ outputFile.substr(0, outputFile.lastIndexOf('/')) }`;
                            await fs.ensureDir(outputDir);
                            const d: any = getTemplateData(f, this.config);
                            const template: any = hb.compile(tmplData.toString('utf-8'), { });
                            const output: string = template({
                                ...this.config.globals,
                                ...d,
                                _publisher: {
                                    files: this.files,
                                    store: this.store,
                                    config: this.config
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
        }
    }
    public static(): void {
        const staticConfig: StaticConfig = this.config?.output?.static;
        if(staticConfig) {
            const templates: string[] = staticConfig.templates;
            templates.forEach((tmpl: string): void => {
                fs.readFile(`${ this.config.prefix }/${ tmpl }`, (err: Error, tmplData: Buffer): void => {
                    const fileName: string = tmpl.split('/').reverse()[0].replace('.hbs', '.html');
                    if(err != null) {
                        console.info(red(`Unable to open file ${ this.config.prefix }/${ tmpl }: ${ err }`));
                    }
                    else {
                        const outputFile = `${ this.config.prefix }/${ this.config.dest }/${ fileName }`;
                        console.info(blue(`Current output file is ${ outputFile }`));
                        const html: string = tmplData.toString('utf-8');
                        const template: any = hb.compile(html, { });
                        const output: string = template({
                            ...this.config.globals,
                            ...{ content: html },
                            _publisher: {
                                files: this.files,
                                store: this.store,
                                config: this.config
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
        }
    }
    public async copy(): Promise<void> {
        if(this.config.assets && this.config.assets.length > 0) {
            await fs.ensureDir(`${ this.config.prefix }/${ this.config.dest }`);
            this.config.assets.forEach((asset): void => {
                const asst: string = asset.split('/').pop();
                fs.copy(`${ this.config.prefix  }/${ asset }`, `${ this.config.prefix  }/${ this.config.dest }/${ asst }`)
                    .then((): void => console.log(`Finished copying to ${ this.config.prefix  }/${ this.config.dest }/${ asst }`))
                    .catch((err: any): void => console.info(red(`Failed to copy to ${ this.config.prefix  }/${ this.config.dest }/${ asst } ${ err }`)));
            });
            if(fs.existsSync(`${ this.config.prefix  }/serve.json`)) {
                fs.copyFile(`${ this.config.prefix  }/serve.json`, `${ this.config.prefix  }/${ this.config.dest }/serve.json`)
                    .then((): void => console.log(`Finished copying to ${ this.config.prefix  }/serve.json`))
                    .catch((err: any): void => console.info(red(`Failed to copy to ${ this.config.prefix  }/${ this.config.dest }/serve.json ${ err }`)));
            }
        }
    }
}
