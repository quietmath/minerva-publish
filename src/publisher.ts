/* eslint-disable no-inner-declarations */
import * as fs from 'fs-extra';
import * as hb from 'handlebars';
import { blue, red } from 'chalk';
import { range } from '@quietmath/proto';
import { JSONStore } from '@quietmath/moneta';
import { PubConfig } from './schema';
import { buildFileTree, getFiles, getFilesFromDisc, storeFiles, getWriteFileName } from './file';
import { registerAllPartials, registerAllHelpers, registerExternalHelpers } from './handlebars';
import { buildOutline, getTemplateData, getMarkdownConverter } from './helpers';

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
        console.info(blue(`Prefix is ${ this.config.prefix }`));
        registerAllPartials(hb, this.config);
        registerAllHelpers(hb);
        if(this.config.helpers) {
            console.log(this.config.helpers);
            registerExternalHelpers(hb, this.config);
        }
    }
    public async sanity(): Promise<void> {
        console.log('Performing sanity check.');
        if(this.tree == null) {
            this.files = await getFilesFromDisc(this.config);
            this.store = storeFiles(this.files, this.config);
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
            const startKey = Object.keys(this.tree[0]).find((e: string) => e === this.config.source);
            buildOutline(this, this.tree[0][startKey]);
            fs.writeFile(`${ this.config.prefix }/${ this.config.source }/SUMMARY.md`, this.summary, { encoding:'utf-8' })
                .then(() => console.log(`Wrote summary file to ${ `${ this.config.prefix }/${ this.config.source }/SUMMARY.md` }`))
                .catch((err) => console.info(red(`Error writing summary file: ${ err }`)));
        }
    }
    public rss(): void {
        if(this.config?.output?.rss) {
            const tmpl = this.config.output.rss.template;
            const maxItems = this.config.output.rss.maxItems;
            const tmplNameParts = tmpl.replace('.hbs', '.xml').split('/');
            const tmplName = tmplNameParts.pop();
            console.info(blue(`Current template name is ${ tmplName }`));
            console.info(blue(`Current template to read is ${ this.config.prefix }/${ tmpl }`));
            const files: string[] | any[] = getFiles(this.store, this.config, this.files);
            fs.readFile(`${ this.config.prefix }/${ tmpl }`, (err: Error, data: Buffer) => {
                if(err != null) {
                    console.info(red(`Unable to open file ${ this.config.prefix }/${ tmpl }: ${ err }`));
                }
                else {
                    const tmplData = [];
                    files.slice(0, (maxItems !== undefined) ? maxItems : undefined).forEach((file: string | any) => {
                        const d = getTemplateData(file, this.config);
                        if(d != null) {
                            tmplData.push(d);
                        }
                    });
                    console.info(blue(`Current handlebar layout is ${ this.config.prefix }/${ this.config.layout }`));
                    const template = hb.compile(data.toString('utf-8'), { });
                    const output = template({
                        posts: tmplData,
                        ...this.config.globals,
                        _publisher: {
                            files: this.files,
                            store: this.store,
                            config: this.config
                        }
                    });
                    console.info(blue(`Writing to file ${ this.config.prefix }/${ this.config.dest }/${ tmplName }`));
                    fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/${ tmplName }`, output, { encoding:'utf-8' })
                        .then(() => console.log(`Wrote partial to ${ `${ this.config.prefix }/${ this.config.dest }/${ tmplName }` }`))
                        .catch((err) => console.info(red(`Error writing partial: ${ err }`)));
                }
            });
        }
    }
    public podcast(): void {
        if(this.config?.output?.podcast?.rss) {
            const tmpl = this.config.output.podcast.rss.template;
            const maxItems = this.config.output.podcast.rss.maxItems;
            const categoryProperty = this.config.output.podcast.categoryProperty;
            const key = this.config.output.podcast.key;
            const podcastFolder: string = this.config.output.podcast.folder;
            const tmplNameParts = tmpl.replace('.hbs', '.xml').split('/');
            const tmplName = tmplNameParts.pop();
            console.info(blue(`Current template name is ${ tmplName }`));
            console.info(blue(`Current file to read is ${ this.config.prefix }/${ tmpl }`));
            const files: string[] | any[] = getFiles(this.store, this.config, this.files);
            fs.readFile(`${ this.config.prefix }/${ tmpl }`, (err: Error, data: Buffer) => {
                if(err != null) {
                    console.info(red(`Unable to open file ${ this.config.prefix }/${ tmpl }: ${ err }`));
                }
                else {
                    const tmplData = [];
                    files.slice(0, (maxItems !== undefined) ? maxItems : undefined).forEach((file: string | any) => {
                        const d = getTemplateData(file, this.config);
                        if(d != null && d[categoryProperty] != null && d[categoryProperty].toLowerCase().indexOf(key) !== -1) {
                            tmplData.push(d);
                        }
                    });
                    console.info(blue(`Current handlebar layout is ${ this.config.prefix }/${ this.config.layout }`));
                    const template = hb.compile(data.toString('utf-8'), { });
                    const output = template({
                        posts: tmplData,
                        ...this.config.globals,
                        _publisher: {
                            files: this.files,
                            store: this.store,
                            config: this.config
                        }
                    });
                    console.info(blue(`Writing to file ${ this.config.prefix }/${ this.config.dest }/${ tmplName }`));
                    const writeFileName: string = getWriteFileName(this.config, tmplName, podcastFolder);
                    fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/${ writeFileName }`, output, { encoding:'utf-8' })
                        .then(() => console.log(`Wrote partial to ${ `${ this.config.prefix }/${ this.config.dest }/${ writeFileName }` }`))
                        .catch((err) => console.info(red(`Error writing partial: ${ err }`)));
                }
            });
        }
    }
    public podcastList(): void {
        if(this.config?.output?.podcast && this.config?.output?.podcast?.folder) {
            if(this.config?.output?.list) {
                const listConfig = this.config.output.list;
                const pagingTemplate: string = this.config.output.podcast.pagingTemplate;
                const pagingFolder: string = this.config.output.podcast.folder;
                const pageSize: number = (listConfig.size != null) ? listConfig.size : 10;
                console.info(blue(`Current page size is ${ pageSize }`));
                const templates = this.config.output.podcast.templates;
                const categoryProperty = this.config.output.podcast.categoryProperty;
                const key = this.config.output.podcast.key;
                console.info(blue(`Current list templates are ${ templates }`));
                let files: string[] | any[] = getFiles(this.store, this.config, this.files);
                if(files.length > 0 && typeof(files[0]) !== 'string') {
                    files = files.filter((e: any) => e.data[categoryProperty] != null && e.data[categoryProperty].toLowerCase().indexOf(key) !== -1);
                }
                console.info(blue(`Current number of markdown files are ${ files.length }`));
                templates.forEach((tmpl: string) => {
                    const tmplNameParts = tmpl.replace('.hbs', '.html').split('/');
                    const tmplName = tmplNameParts.pop();
                    console.info(blue(`Current template name is ${ tmplName }`));
                    console.info(blue(`Current file to read is ${ this.config.prefix }/${ tmpl }`));
                    fs.readFile(`${ this.config.prefix }/${ tmpl }`, (err: Error, data: Buffer) => {
                        let totalPages = Math.ceil(files.length / pageSize);
                        if(tmpl != pagingTemplate) {
                            totalPages = 1;
                        }
                        range(totalPages).forEach((num: number) => {
                            if(err != null) {
                                console.info(red(`Unable to open file ${ this.config.prefix }/${ tmpl }: ${ err }`));
                            }
                            else {
                                const tmplData = [];
                                const start = (num -1) * pageSize;
                                const end = start + pageSize;
                                const currentFiles: string[] = files.slice(start, end);
                                currentFiles.forEach((file: string | any) => {
                                    const d = getTemplateData(file, this.config);
                                    if(d[categoryProperty] != null && d[categoryProperty].toLowerCase().indexOf(key) !== -1) {
                                        tmplData.push(d);
                                    }
                                });
                                console.info(blue(`Current handlebar layout is ${ this.config.prefix }/${ this.config.layout }`));
                                const template = hb.compile(data.toString('utf-8'), { });
                                const pagingLinks = {
                                    nextPage: ((num + 1 == totalPages) ? undefined : num + 1),
                                    prevPage: ((num - 1 == 0) ? undefined : (num - 1)),
                                    pagingFolder: pagingFolder
                                };
                                const output = template({
                                    posts: tmplData,
                                    ...pagingLinks,
                                    ...this.config.globals,
                                    _publisher: {
                                        files: this.files,
                                        store: this.store,
                                        config: this.config
                                    }
                                });
                                console.info(blue(`Writing to file ${ this.config.prefix }/${ this.config.dest }/${ tmplName }`));
                                if(totalPages === 1) {
                                    fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/${ tmplName }`, output, { encoding:'utf-8' })
                                        .then(() => console.log(`Wrote partial to ${ `${ this.config.prefix }/${ this.config.dest }/${ tmplName }` }`))
                                        .catch((err) => console.info(red(`Error writing partial: ${ err }`)));
                                }
                                else {
                                    const writeFileName: string = getWriteFileName(this.config, num as any as string, pagingFolder);
                                    fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/${ writeFileName }`, output, { encoding:'utf-8' })
                                        .then(() => console.log(`Wrote partial to ${ `${ this.config.prefix }/${ this.config.dest }/${ writeFileName }` }`))
                                        .catch((err) => console.info(red(`Error writing partial: ${ err }`)));
                                }
                            }
                        });
                    });
                });
            }
        }
    }
    public list(): void {
        if(this.config?.output?.list) {
            const listConfig = this.config.output.list;
            const pagingTemplate: string = listConfig.pagingTemplate;
            const pagingFolder: string = listConfig.pagingFolder;
            const pageSize: number = (listConfig.size != null) ? listConfig.size : 10;
            const skipPages: number = (listConfig.skip != null) ? listConfig.skip : 0;
            console.info(blue(`Current page size is ${ pageSize }`));
            const templates = listConfig.templates;
            console.info(blue(`Current list templates are ${ templates }`));
            const files: string[] | any[] = getFiles(this.store, this.config, this.files);    
            console.info(blue(`Current number of markdown files are ${ files.length }`));
            templates.forEach((tmpl: string) => {
                const tmplNameParts = tmpl.replace('.hbs', '.html').split('/');
                const tmplName = tmplNameParts.pop();
                console.info(blue(`Current template name is ${ tmplName }`));
                console.info(blue(`Current file to read is ${ this.config.prefix }/${ tmpl }`));
                fs.readFile(`${ this.config.prefix }/${ tmpl }`, (err: Error, data: Buffer) => {
                    const fileSlice = (tmpl == pagingTemplate) ? files.slice(skipPages) : files;
                    let totalPages = Math.ceil(fileSlice.length / pageSize);
                    if(tmpl != pagingTemplate) {
                        totalPages = 1;
                    }
                    range(totalPages).forEach((num: number) => {
                        if(err != null) {
                            console.info(red(`Unable to open file ${ this.config.prefix }/${ tmpl }: ${ err }`));
                        }
                        else {
                            const tmplData = [];
                            const start = (num -1) * pageSize;
                            const end = start + pageSize;
                            const currentFiles: string[] = fileSlice.slice(start, end);
                            currentFiles.forEach((file: string | any) => {
                                const d = getTemplateData(file, this.config);
                                tmplData.push(d);
                            });
                            console.info(blue(`Current handlebar layout is ${ this.config.prefix }/${ this.config.layout }`));
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
                                    files: this.files,
                                    store: this.store,
                                    config:
                                    this.config
                                }
                            });
                            console.info(blue(`Writing to file ${ this.config.prefix }/${ this.config.dest }/${ tmplName }`));
                            if(totalPages === 1) {
                                fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/${ tmplName }`, output, { encoding:'utf-8' })
                                    .then(() => console.log(`Wrote partial to ${ `${ this.config.prefix }/${ this.config.dest }/${ tmplName }` }`))
                                    .catch((err) => console.info(red(`Error writing partial: ${ err }`)));
                            }
                            else {
                                const writeFileName: string = getWriteFileName(this.config, num as any as string, pagingFolder);
                                fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/${ writeFileName }`, output, { encoding:'utf-8' })
                                    .then(() => console.log(`Wrote partial to ${ `${ this.config.prefix }/${ this.config.dest }/${ writeFileName }` }`))
                                    .catch((err) => console.info(red(`Error writing partial: ${ err }`)));
                            }
                        }
                    });
                });
            });
        }
    }
    public toc(): void {
        const outline = this.config?.output?.outline;
        if(outline) {
            fs.readFile(`${ this.config.prefix }/${ this.config.source }/SUMMARY.md`, (err: Error, data: Buffer) => {
                if(err != null) {
                    console.info(red(`Unable to open file ${ this.config.prefix }/${ this.config.source }/SUMMARY.md: ${ err }`));
                }
                else {
                    let md = data.toString('utf-8');
                    md = md.replace(/\.md/ig, '.html');
                    const c = getMarkdownConverter();
                    const html = c.makeHtml(md);
                    const template = hb.compile(html);
                    const output = template({
                        _publisher: {
                            files: this.files,
                            store: this.store,
                            config: this.config
                        }
                    });
                    fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/TOC.html`, output, { encoding:'utf-8' })
                        .then(() => console.log(`Wrote TOC file to ${ `${ this.config.prefix }/${ this.config.dest }/TOC.html` }`))
                        .catch((err) => console.info(red(`Error writing TOC: ${ err }`)));
                }
            });
        }
    }
    public view(): void {
        if(this.config?.output?.view) {
            const viewConfig = this.config.output.view;
            const templates = viewConfig.templates;
            console.info(blue(`Current templates are ${ templates }`));
            const files: any[] | string[] = getFiles(this.store, this.config, this.files);
            console.info(blue(`Current file length is ${ files.length }`));
            templates.forEach((tmpl: string) => {
                console.info(blue(`Current template string is ${ tmpl }`));
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
                            console.info(`Current output directory is ${ outputDir }`);
                            await fs.ensureDir(outputDir);
                            const d = getTemplateData(f, this.config);
                            const template = hb.compile(tmplData.toString('utf-8'), { });
                            const output = template({
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
        const staticConfig = this.config?.output?.static;
        if(staticConfig) {
            const templates = staticConfig.templates;
            console.info(blue(`Current templates are ${ templates }`));
            templates.forEach((tmpl: string): void => {
                console.info(blue(`Current template string is ${ tmpl }`));
                fs.readFile(`${ this.config.prefix }/${ tmpl }`, (err: Error, tmplData: Buffer): void => {
                    const fileName = tmpl.split('/').reverse()[0].replace('.hbs', '.html');
                    if(err != null) {
                        console.info(red(`Unable to open file ${ this.config.prefix }/${ tmpl }: ${ err }`));
                    }
                    else {
                        const outputFile = `${ this.config.prefix }/${ this.config.dest }/${ fileName }`;
                        console.info(blue(`Current output file is ${ outputFile }`));
                        const html = tmplData.toString('utf-8');
                        const template = hb.compile(html, { });
                        const output = template({
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
            this.config.assets.forEach((asset) => {
                const asst = asset.split('/').pop();
                fs.copy(`${ this.config.prefix  }/${ asset }`, `${ this.config.prefix  }/${ this.config.dest }/${ asst }`)
                    .then(() => console.log(`Finished copying to ${ this.config.prefix  }/${ this.config.dest }/${ asst }`))
                    .catch(err => console.info(red(`Failed to copy to ${ this.config.prefix  }/${ this.config.dest }/${ asst } ${ err }`)));
            });
            if(fs.existsSync(`${ this.config.prefix  }/serve.json`)) {
                fs.copyFile(`${ this.config.prefix  }/serve.json`, `${ this.config.prefix  }/${ this.config.dest }/serve.json`)
                    .then(() => console.log(`Finished copying to ${ this.config.prefix  }/serve.json`))
                    .catch(err => console.info(red(`Failed to copy to ${ this.config.prefix  }/${ this.config.dest }/serve.json ${ err }`)));
            }
        }
    }
}
