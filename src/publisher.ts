/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-this-alias */
import * as glob from 'glob';
import * as fs from 'fs-extra';
import { Converter } from 'showdown';
import * as matter from 'gray-matter';
import * as hb from 'handlebars';
import * as moment from 'moment';
import { blue, red } from 'chalk';
import { range, s } from '@quietmath/proto';
import { JSONStore } from '@quietmath/moneta';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ListConfig, ViewConfig, StaticConfig, OutputConfig, PubConfig } from './schema';
import { registerAllHelpers } from './helpers';

/**
 * @module quietmath/minerva-publish
 */

export class Publisher {
    private files: string[];
    private store: JSONStore;
    private tree: any;
    private summary: string;
    private config: PubConfig;
    constructor(config: PubConfig) {
        this.config = config;
        if(this.config.prefix !== undefined) {
            console.log('Prefix is absolute.');
        }
        else {
            this.config.prefix = process.cwd();
            console.info(blue(`Prefix is ${ this.config.prefix }`));
        }
        hb.registerPartial('layout', fs.readFileSync(`${ this.config.prefix }/${ this.config.layout }`, 'utf8'));
        registerAllHelpers(hb);
    }
    private getOutputLink(path: string): string {
        path = path.replace(`${ this.config.prefix }`, '')
            .replace(`${ this.config.source }/`, '')
            .replace('.md', (this.config?.output?.includeExtension ? '.html' : ''));
        console.info(blue(`This output link path is ${ path }`));
        return path;
    }
    private getAllFiles(): Promise<string[]> {
        console.log('Retrieving all files.');
        return new Promise((resolve, reject): any => {
            glob(`${ this.config.prefix }/${ this.config.source }/**/**`, { 'ignore': ['**/node_modules/**', `**/${ this.config.prefix }/${ this.config.dest }/**`, '**/SUMMARY.md'], mark: true }, async (err: Error, files: string[]) => {
                if(err != null) {
                    reject(`An error has occurred: ${ err }`);
                }
                resolve(files);
            });
        });
        
    }
    private buildFileTree(): any {
        const self: Publisher = this;
        function getFilename(path: string): string {
            return path.split('/').filter((e: string): number => {
                return e && e.length;
            }).reverse()[0];
        }
        function findSubPaths(path: string): string[] {
            const rePath: string = path.replace('/', '\\/');
            const re = new RegExp('^' + rePath + '[^\\/]*\\/?$');
            return self.files.filter(function(i: string): boolean {
                return i !== path && re.test(i);
            });
        }
        function buildTree(path?: string): any[] {
            path = path || '';
            const nodeList: any[] = [];
            findSubPaths(path).forEach(function(subPath: string): void {
                const nodeName = getFilename(subPath);
                if (/\/$/.test(subPath)) {
                    const node = {};
                    node[nodeName] = buildTree(subPath);
                    nodeList.push(node);
                } else {
                    nodeList.push(nodeName);
                }
            });
            return nodeList;
        }
        return buildTree();
    }
    private storeFiles(): void {
        this.store = new JSONStore('minerva.json');
        this.store.create('pages');
        const keyType = this.config?.output?.list?.order?.type;
        this.files.forEach((f: string) => {
            const md = fs.readFileSync(f, { encoding: 'utf-8' });
            const gray = matter(md);
            const sortKey = gray.data[keyType];
            if(sortKey === undefined) {
                throw new Error(`Failed to find key ${ keyType } in file ${ f }.`);
            }
            let key;
            switch(keyType) {
                case 'string':
                    break;
                case 'number':
                    try {
                        key = parseInt(sortKey);
                    }
                    catch(e) {
                        throw new Error(`The key ${ sortKey } is not a number. ${ e }`);
                    }
                    break;
                case 'date':
                    try {
                        const sortDate = moment(sortKey);
                        key = sortDate.format();
                    }
                    catch(e) {
                        throw new Error(`The key ${ sortKey } is not a number. ${ e }`);
                    }
                    break;
                default:
                    try {
                        key = f.split('/').pop();
                    }
                    catch(e) {
                        throw new Error(`Failed to retrieve file name. ${ e }`);
                    }
                    break;
            }
            //Break apart categories and store in the data
            this.store.insert('pages', key, gray);
        });
    }
    public async sanity(): Promise<void> {
        console.log('Starting sanity check.');
        if(this.tree == null) {
            this.files = await this.getAllFiles();
            console.log('Acquired files.');
            this.tree = this.buildFileTree();
            console.log('Acquired file tree.');
        }
    }
    public outline(): void {
        const self: Publisher = this;
        if(this.config?.output?.outline) {
            function addHashes(key: string, offset: number): string {
                const file: string = self.files.find((e: string) => e.indexOf(key) !== -1);
                const range: number = file.split('/').length + offset;
                for(let i = 0; i < range; i++) {
                    self.summary += `#`;
                }
                return file.replace(`${ self.config.source }`, '.');
            }
            function buildOutline(arr: any): void {
                arr.forEach((itm: any | string) => {
                    if(typeof(itm) !== 'string') {
                        const key = Object.keys(itm)[0];
                        addHashes(key, -1);
                        self.summary += ` ${ s(key.replace(/_/ig, ' ')).capWords().toString() }\n\n`;
                        buildOutline(itm[key]);
                    }
                    else {
                        const anchor = addHashes(itm, 0);
                        self.summary += ` [${ s(itm.replace(/\.md/ig,'').replace(/_/ig,' ')).capWords().toString() }](${ anchor })\n\n`;
                    }
                });
            }
            this.summary = '# Summary\n\n';
            const startKey = Object.keys(this.tree[0]).find((e: string) => e === this.config.source);
            buildOutline(this.tree[0][startKey]);
            fs.writeFile(`${ this.config.prefix }/${ this.config.source }/SUMMARY.md`, this.summary, { encoding:'utf-8' })
                .then(() => console.log(`Wrote summary file to ${ `${ this.config.prefix }/${ this.config.source }/SUMMARY.md` }`))
                .catch((err) => console.info(red(`Error writing summary file: ${ err }`)));
        }
    }
    public rss(): void {
        if(this.config?.output?.rss) {
            console.log('Now running rss configuration.');
            const tmpl = this.config.output.rss;
            console.info(blue(`Current template string is ${ tmpl }`));
            const tmplNameParts = tmpl.replace('.hbs', '').split('/');
            console.info(blue(`Current template part replacement: ${ tmplNameParts }`));
            const tmplName = tmplNameParts.pop();
            console.info(blue(`Current template name is ${ tmplName }`));
            console.info(blue(`Current file to read is ${ this.config.prefix }/${ tmpl }`));
            fs.readFile(`${ this.config.prefix }/${ tmpl }`, (err: Error, data: Buffer) => {
                if(err != null) {
                    console.info(red(`Unable to open file ${ this.config.prefix }/${ tmpl }: ${ err }`));
                }
                else {
                    const tmplData = [];
                    this.files.forEach((file: string) => {
                        try {
                            console.info(blue(`Current file is ${ file }`));
                            const md = fs.readFileSync(file, { encoding: 'utf-8' });
                            const gray = matter(md);
                            gray.data['link'] = this.getOutputLink(file);
                            tmplData.push(gray.data);
                        }
                        catch(e) {
                            console.info(red(`Unable to open file ${ this.config.prefix }/${ file }: ${ e }`));
                        }
                    });
                    console.info(blue(`Current handlebar layout is ${ this.config.prefix }/${ this.config.layout }`));
                    const template = hb.compile(data.toString('utf-8'), { });
                    const output = template({ posts: tmplData });
                    console.info(blue(`Writing to file ${ this.config.prefix }/${ this.config.dest }/${ tmplName }`));
                    fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/${ tmplName }`, output, { encoding:'utf-8' })
                        .then(() => console.log(`Wrote partial to ${ `${ this.config.prefix }/${ this.config.dest }/${ tmplName }` }`))
                        .catch((err) => console.info(red(`Error writing partial: ${ err }`)));
                }
            });
        }
    }
    public podcast(): void {
        if(this.config?.output?.podcast) {
            console.log('Now running rss configuration.');
            const tmpl = this.config.output.podcast.template;
            const categoryProperty = this.config.output.podcast.categoryProperty;
            const key = this.config.output.podcast.key;
            console.info(blue(`Current template string is ${ tmpl }`));
            const tmplNameParts = tmpl.replace('.hbs', '').split('/');
            console.info(blue(`Current template part replacement: ${ tmplNameParts }`));
            const tmplName = tmplNameParts.pop();
            console.info(blue(`Current template name is ${ tmplName }`));
            console.info(blue(`Current file to read is ${ this.config.prefix }/${ tmpl }`));
            fs.readFile(`${ this.config.prefix }/${ tmpl }`, (err: Error, data: Buffer) => {
                if(err != null) {
                    console.info(red(`Unable to open file ${ this.config.prefix }/${ tmpl }: ${ err }`));
                }
                else {
                    const tmplData = [];
                    this.files.forEach((file: string) => {
                        try {
                            console.info(blue(`Current file is ${ file }`));
                            const md = fs.readFileSync(file, { encoding: 'utf-8' });
                            const gray = matter(md);
                            gray.data['link'] = this.getOutputLink(file);
                            if(gray.data[categoryProperty] != null && gray.data[categoryProperty].toLowerCase().indexOf(key) !== -1) {
                                tmplData.push(gray.data);
                            }
                        }
                        catch(e) {
                            console.info(red(`Unable to open file ${ this.config.prefix }/${ file }: ${ e }`));
                        }
                    });
                    console.info(blue(`Current handlebar layout is ${ this.config.prefix }/${ this.config.layout }`));
                    const template = hb.compile(data.toString('utf-8'), { });
                    const output = template({ posts: tmplData });
                    console.info(blue(`Writing to file ${ this.config.prefix }/${ this.config.dest }/${ tmplName }`));
                    fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/${ tmplName }`, output, { encoding:'utf-8' })
                        .then(() => console.log(`Wrote partial to ${ `${ this.config.prefix }/${ this.config.dest }/${ tmplName }` }`))
                        .catch((err) => console.info(red(`Error writing partial: ${ err }`)));
                }
            });
        }
    }
    public podcastList(): void {
        if(this.config?.output?.podcast && this.config?.output?.podcast?.folder) {
            console.log('Now running list configuration.');
            const c = new Converter({
                ghCompatibleHeaderId: true,
                parseImgDimensions: true,
                strikethrough: true,
                tables: true,
                ghCodeBlocks: true,
                tasklists: true,
                requireSpaceBeforeHeadingText: true
            });
            if(this.config?.output?.list) {
                const listConfig = this.config.output.list;
                const pagingTemplate: string = listConfig.pagingTemplate;
                const pagingFolder: string = this.config.output.podcast.folder;
                const pageSize: number = (listConfig.size != null) ? listConfig.size : 10;
                console.info(blue(`Current page size is ${ pageSize }`));
                const orderBy = (listConfig.order != null && listConfig.order.orderBy) ? listConfig.order.orderBy : 'date';
                const orderDirection = (listConfig.order != null && listConfig.order.direction) ? listConfig.order.direction : 'desc';
                const templates = listConfig.templates;
                console.info(blue(`Current list templates are ${ templates }`));
                const files = this.files.filter((e: string) => e.endsWith('.md'));
                console.info(blue(`Current number of markdown files are ${ files.length }`));

                templates.forEach((tmpl: string) => {
                    console.info(blue(`Current template string is ${ tmpl }`));
                    const tmplNameParts = tmpl.replace('.hbs', '.html').split('/');
                    console.info(blue(`Current template part replacement: ${ tmplNameParts }`));
                    const tmplName = tmplNameParts.pop();
                    console.info(blue(`Current template name is ${ tmplName }`));
                    console.info(blue(`Current file to read is ${ this.config.prefix }/${ tmpl }`));
                    fs.readFile(`${ this.config.prefix }/${ tmpl }`, (err: Error, data: Buffer) => {

                        let totalPages = Math.ceil(files.length / pageSize);
                        if(tmpl != pagingTemplate) {
                            totalPages = 1;
                        }
                        range(totalPages).forEach((num: number) => { //This will not work without the database...
                            if(err != null) {
                                console.info(red(`Unable to open file ${ this.config.prefix }/${ tmpl }: ${ err }`));
                            }
                            else {
                                const tmplData = [];
                                const start = (num -1) * pageSize;
                                const end = start + pageSize;
                                const currentFiles: string[] = files.slice(start, end);
                                currentFiles.forEach((file: string) => {
                                    try {
                                        console.info(blue(`Current file is ${ file }`));
                                        const md = fs.readFileSync(file, { encoding: 'utf-8' });
                                        const gray = matter(md);
                                        gray.data.content = c.makeHtml(gray.content);
                                        gray.data['link'] = this.getOutputLink(file);
                                        tmplData.push(gray.data);
                                    }
                                    catch(e) {
                                        console.info(red(`Unable to open file ${ this.config.prefix }/${ file }: ${ e }`));
                                    }
                                });
                                console.info(blue(`Current handlebar layout is ${ this.config.prefix }/${ this.config.layout }`));
                                const template = hb.compile('{{#> layout }}' + data.toString('utf-8') + '{{/layout}}', { });
                                const pagingLinks = {
                                    nextPage: ((num + 1 == totalPages) ? undefined : num + 1),
                                    prevPage: ((num - 1 == 0) ? undefined : (num - 1))
                                };
                                const output = template({ posts: tmplData, ...pagingLinks });
                                //Need to page subfolder for paging
                                console.info(blue(`Writing to file ${ this.config.prefix }/${ this.config.dest }/${ tmplName }`));
                                if(totalPages === 1) {
                                    fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/${ tmplName }`, output, { encoding:'utf-8' })
                                        .then(() => console.log(`Wrote partial to ${ `${ this.config.prefix }/${ this.config.dest }/${ tmplName }` }`))
                                        .catch((err) => console.info(red(`Error writing partial: ${ err }`)));
                                }
                                else {
                                    if(pagingFolder) {
                                        fs.ensureDirSync(`${ this.config.prefix }/${ this.config.dest }/${ pagingFolder }`);
                                    }
                                    const pagingFileName: string = (pagingFolder != null) ? `${ pagingFolder }/${ num }.html` : `${ num }.html`;
                                    fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/${ pagingFileName }`, output, { encoding:'utf-8' })
                                        .then(() => console.log(`Wrote partial to ${ `${ this.config.prefix }/${ this.config.dest }/${ pagingFileName }` }`))
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
        console.log('Now running list configuration.');
        const c = new Converter({
            ghCompatibleHeaderId: true,
            parseImgDimensions: true,
            strikethrough: true,
            tables: true,
            ghCodeBlocks: true,
            tasklists: true,
            requireSpaceBeforeHeadingText: true
        });
        if(this.config?.output?.list) {
            const listConfig = this.config.output.list;
            const pagingTemplate: string = listConfig.pagingTemplate;
            const pagingFolder: string = listConfig.pagingFolder;
            const pageSize: number = (listConfig.size != null) ? listConfig.size : 10;
            console.info(blue(`Current page size is ${ pageSize }`));
            const orderBy = (listConfig.order != null && listConfig.order.orderBy) ? listConfig.order.orderBy : 'date';
            const orderDirection = (listConfig.order != null && listConfig.order.direction) ? listConfig.order.direction : 'desc';
            const templates = listConfig.templates;
            console.info(blue(`Current list templates are ${ templates }`));
            const files = this.files.filter((e: string) => e.endsWith('.md'));
            console.info(blue(`Current number of markdown files are ${ files.length }`));

            templates.forEach((tmpl: string) => {
                console.info(blue(`Current template string is ${ tmpl }`));
                const tmplNameParts = tmpl.replace('.hbs', '.html').split('/');
                console.info(blue(`Current template part replacement: ${ tmplNameParts }`));
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
                            currentFiles.forEach((file: string) => {
                                try {
                                    console.info(blue(`Current file is ${ file }`));
                                    const md = fs.readFileSync(file, { encoding: 'utf-8' });
                                    const gray = matter(md);
                                    gray.data.content = c.makeHtml(gray.content);
                                    gray.data['link'] = this.getOutputLink(file);
                                    tmplData.push(gray.data);
                                }
                                catch(e) {
                                    console.info(red(`Unable to open file ${ this.config.prefix }/${ file }: ${ e }`));
                                }
                            });
                            console.info(blue(`Current handlebar layout is ${ this.config.prefix }/${ this.config.layout }`));
                            const template = hb.compile('{{#> layout }}' + data.toString('utf-8') + '{{/layout}}', { });
                            const pagingLinks = {
                                nextPage: ((num + 1 == totalPages) ? undefined : num + 1),
                                prevPage: ((num - 1 == 0) ? undefined : (num - 1))
                            };
                            const output = template({ posts: tmplData, ...pagingLinks });
                            //Need to page subfolder for paging
                            console.info(blue(`Writing to file ${ this.config.prefix }/${ this.config.dest }/${ tmplName }`));
                            if(totalPages === 1) {
                                fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/${ tmplName }`, output, { encoding:'utf-8' })
                                    .then(() => console.log(`Wrote partial to ${ `${ this.config.prefix }/${ this.config.dest }/${ tmplName }` }`))
                                    .catch((err) => console.info(red(`Error writing partial: ${ err }`)));
                            }
                            else {
                                if(pagingFolder) {
                                    fs.ensureDirSync(`${ this.config.prefix }/${ this.config.dest }/${ pagingFolder }`);
                                }
                                const pagingFileName: string = (pagingFolder != null) ? `${ pagingFolder }/${ num }.html` : `${ num }.html`;
                                fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/${ pagingFileName }`, output, { encoding:'utf-8' })
                                    .then(() => console.log(`Wrote partial to ${ `${ this.config.prefix }/${ this.config.dest }/${ pagingFileName }` }`))
                                    .catch((err) => console.info(red(`Error writing partial: ${ err }`)));
                            }
                        }
                    });
                });
            });
        }
    }
    public toc(): void { //Change summary links to point to HTML links and output HTML
        const outline = this.config?.output?.outline;
        if(outline) {
            fs.readFile(`${ this.config.prefix }/${ this.config.source }/SUMMARY.md`, (err: Error, data: Buffer) => {
                if(err != null) {
                    console.info(red(`Unable to open file ${ this.config.prefix }/${ this.config.source }/SUMMARY.md: ${ err }`));
                }
                else {
                    let md = data.toString('utf-8');
                    md = md.replace(/\.md/ig, '.html');
                    
                    const c = new Converter({
                        requireSpaceBeforeHeadingText: true
                    });
                    const html = c.makeHtml(md);
                    const template = hb.compile(html);
                    const output = template({ });
                    
                    fs.writeFile(`${ this.config.prefix }/${ this.config.dest }/TOC.html`, output, { encoding:'utf-8' })
                        .then(() => console.log(`Wrote TOC file to ${ `${ this.config.prefix }/${ this.config.dest }/TOC.html` }`))
                        .catch((err) => console.info(red(`Error writing TOC: ${ err }`)));
                }
            });
        }
    }
    public view(): void {
        console.log('Now running view configuration.');
        const c = new Converter({
            ghCompatibleHeaderId: true,
            parseImgDimensions: true,
            strikethrough: true,
            tables: true,
            ghCodeBlocks: true,
            tasklists: true,
            requireSpaceBeforeHeadingText: true
        });
        if(this.config?.output?.view) {
            const viewConfig = this.config.output.view;
            const templates = viewConfig.templates;
            console.info(blue(`Current templates are ${ templates }`));
            const files = this.files.filter((e: string) => e.endsWith('.md'));
            console.info(blue(`Current file length is ${ files.length }`));
            
            templates.forEach((tmpl: string) => {
                console.info(blue(`Current template string is ${ tmpl }`));
                fs.readFile(`${ this.config.prefix }/${ tmpl }`, (err: Error, tmplData: Buffer) => {
                    if(err != null) {
                        console.info(red(`Unable to open file ${ this.config.prefix }/${ tmpl }: ${ err }`));
                    }
                    else {
                        files.forEach(async (f) => {
                            console.log(`Publishing file ${ f }`);
                            const outputFile = `${ this.config.prefix }/${ this.config.dest }/${ f.replace(`${ this.config.prefix }/`,'')
                                .replace(`${ this.config.source }/`, '')
                                .replace('.md','.html') }`;
                            console.info(blue(`Current output file is ${ outputFile }`));
                            const outputDir = `${ outputFile.substr(0, outputFile.lastIndexOf('/')) }`;
                            console.log(`Current output directory is ${ outputDir }`);
                            await fs.ensureDir(outputDir);
                            fs.readFile(f, (err, data) => {
                                console.info(blue(`Current file is ${ f }`));
                                if(err != null) {
                                    console.info(red(`Error reading file: ${ err }`));
                                }
                                else {
                                    const md = data.toString('utf-8');
                                    const gray = matter(md);
                                    gray.data.content = c.makeHtml(gray.content);
                                    const template = hb.compile('{{#> layout }}' + tmplData.toString('utf-8') + '{{/layout}}', { });
                                    const output = template({ ...this.config.globals, ...gray.data });
                                    fs.writeFile(`${ outputFile }`, output, (e) => {
                                        if(e != null) {
                                            console.info(red(`Failed to write file ${ e }`));
                                        }
                                    });
                                }
                            });
                        });
                    }
                });
            });
        }
    }
    public static(): void {
        console.log('Now running static configuration.');
        const staticConfig = this.config?.output?.static;
        if(staticConfig) {
            const templates = staticConfig.templates;
            console.info(blue(`Current templates are ${ templates }`));

            templates.forEach((tmpl: string) => {
                console.info(blue(`Current template string is ${ tmpl }`));
                fs.readFile(`${ this.config.prefix }/${ tmpl }`, (err: Error, tmplData: Buffer) => {
                    const fileName = tmpl.split('/').reverse()[0].replace('.hbs', '.html');
                    if(err != null) {
                        console.info(red(`Unable to open file ${ this.config.prefix }/${ tmpl }: ${ err }`));
                    }
                    else {
                        const outputFile = `${ this.config.prefix }/${ this.config.dest }/${ fileName }`;
                        console.info(blue(`Current output file is ${ outputFile }`));
                        const html = tmplData.toString('utf-8');
                        const template = hb.compile('{{#> layout }}' + html + '{{/layout}}', { });
                        const output = template({ ...this.config.globals, ...{ content: html } });
                        fs.writeFile(`${ outputFile }`, output, (e) => {
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
