/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-this-alias */
import * as glob from 'glob';
import * as fs from 'fs-extra';
import { Converter } from 'showdown';
import * as matter from 'gray-matter';
import * as hb from 'handlebars';
import { s } from '@quietmath/proto';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ListConfig, ViewConfig, StaticConfig } from './schema';

/**
 * @module quietmath/minerva-publish
 */

export class Publisher {
    private files: string[];
    private tree: any;
    private summary: string;
    public prefix: string;
    public source: string;
    public destination: string;
    public layout: string;
    public globals: any;
    constructor(prefix: string, source: string, dest: string, layout: string, globals: any = {}) {
        if(this.prefix === 'absolute') {
            console.log('Prefix is abolute.');
            this.prefix = prefix;
        }
        else {
            this.prefix = process.cwd();
            console.info(`Prefix is ${ this.prefix }`);
        }
        this.source = source;
        this.destination = dest;
        this.layout = layout;
        this.globals = globals;
    }
    private getOutputLink(path: string): string {
        path = path.replace(`${ this.source }/`, `${ this.destination }/`).replace('.md','.html');
        console.info(`This output link path is ${ path }`);
        return path;
    }
    private getAllFiles(): Promise<string[]> {
        console.log('Retrieving all files.');
        return new Promise((resolve, reject): any => {
            glob(`${ this.prefix }/${ this.source }/**/**`, { 'ignore': ['**/node_modules/**', `**/${ this.prefix }/${ this.destination }/**`, '**/SUMMARY.md'], mark: true }, async (err: Error, files: string[]) => {
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
    public async sanity(): Promise<void> {
        console.log('Starting sanity check.');
        if(this.tree == null) {
            this.files = await this.getAllFiles();
            console.log('Acquired files.');
            this.tree = this.buildFileTree();
            console.log('Acquired file tree.');
        }
    }
    public outline(outline: boolean): void {
        const self: Publisher = this;
        if(outline) {
            function addHashes(key: string, offset: number): string {
                const file: string = self.files.find((e: string) => e.indexOf(key) !== -1);
                const range: number = file.split('/').length + offset;
                for(let i = 0; i < range; i++) {
                    self.summary += `#`;
                }
                return file.replace(`${ self.source }`, '.');
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
            const startKey = Object.keys(this.tree[0]).find((e: string) => e === this.source);
            buildOutline(this.tree[0][startKey]);
            fs.writeFile(`${ this.prefix }/${ this.source }/SUMMARY.md`, this.summary, { encoding:'utf-8' })
                .then(() => console.log(`Wrote summary file to ${ `${ this.prefix }/${ this.source }/SUMMARY.md` }`))
                .catch((err) => console.error(`Error writing summary file: ${ err }`));
        }
    }
    public list(listConfig: ListConfig): void {
        console.log('Now running list configuration.');
        if(listConfig) {
            const pageSize: number = (listConfig.size != null) ? listConfig.size : 10;
            console.info(`Current page size is ${ pageSize }`);
            //const orderBy = (listConfig.order != null && listConfig.order.orderBy) ? listConfig.order.orderBy : 'date';
            //const orderDirection = (listConfig.order != null && listConfig.order.direction) ? listConfig.order.direction : 'desc';
            const templates = listConfig.templates;
            console.info(`Current list templates are ${ templates }`);
            const files = this.files.filter((e: string) => e.endsWith('.md'));
            console.info(`Current number of markdown files are ${ files.length }`);

            templates.forEach((tmpl: string) => {
                console.info(`Current template string is ${ tmpl }`);
                const tmplNameParts = tmpl.replace('.hbs', '.html').split('/');
                console.info(`Current template part replacement: ${ tmplNameParts }`);
                const tmplName = tmplNameParts.pop();
                console.info(`Current template name is ${ tmplName }`);
                console.info(`Current file to read is ${ this.prefix }/${ tmpl }`);
                fs.readFile(`${ this.prefix }/${ tmpl }`, (err: Error, data: Buffer) => {
                    if(err != null) {
                        console.error(`Unable to open file ${ this.prefix }/${ tmpl }: ${ err }`);
                    }
                    else {
                        const tmplData = [];
                        files.slice(0, (pageSize)).forEach((file: string) => {
                            try {
                                console.info(`Current file is ${ this.prefix }/${ file }`);
                                const md = fs.readFileSync(`${ this.prefix }/${ file }`, { encoding: 'utf-8' });
                                const gray = matter(md);
                                gray.data['link'] = this.getOutputLink(file);
                                tmplData.push(gray.data);
                            }
                            catch(e) {
                                console.error(`Unable to open file ${ this.prefix }/${ file }: ${ e }`);
                            }
                        });
                        console.info(`Current handlebar layout is ${ this.prefix }/${ this.layout }`);
                        hb.registerPartial('layout', fs.readFileSync(`${ this.prefix }/${ this.layout }`, 'utf8'));
                        const template = hb.compile('{{#> layout }}' + data.toString('utf-8') + '{{/layout}}', { });
                        const output = template({ posts: tmplData });

                        console.info(`Writing to file ${ this.prefix }/${ this.destination }/${ tmplName }`);
                        fs.writeFile(`${ this.prefix }/${ this.destination }/${ tmplName }`, output, { encoding:'utf-8' })
                            .then(() => console.log(`Wrote partial to ${ `${ this.prefix }/${ this.destination }/${ tmplName }` }`))
                            .catch((err) => console.error(`Error writing partial: ${ err }`));
                    }
                });
            });
        }
    }
    public toc(outline: boolean): void { //Change summary links to point to HTML links and output HTML
        if(outline) {
            fs.readFile(`${ this.prefix }/${ this.source }/SUMMARY.md`, (err: Error, data: Buffer) => {
                if(err != null) {
                    console.error(`Unable to open file ${ this.prefix }/${ this.source }/SUMMARY.md: ${ err }`);
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
                    
                    fs.writeFile(`${ this.prefix }/${ this.destination }/TOC.html`, output, { encoding:'utf-8' })
                        .then(() => console.log(`Wrote TOC file to ${ `${ this.prefix }/${ this.destination }/TOC.html` }`))
                        .catch((err) => console.error(`Error writing TOC: ${ err }`));
                }
            });
        }
    }
    public view(viewConfig: ViewConfig): void {
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
        const templates = viewConfig.templates;
        console.info(`Current templates are ${ templates }`);
        const files = this.files.filter((e: string) => e.endsWith('.md'));
        console.info(`Current file length is ${ files.length }`);
        //await fs.ensureDir(`${ this.prefix }/${ this.destination }`);
        
        templates.forEach((tmpl: string) => {
            console.info(`Current template string is ${ tmpl }`);
            files.forEach(async (f) => {
                console.log(`Publishing file ${ f }`);
                const outputFile = `${ this.prefix }/${ this.destination }/${ f.replace(`${ this.source }/`,'').replace('.md','.html') }`;
                console.info(`Current output file is ${ outputFile }`);
                const outputDir = `${ outputFile.substr(0, outputFile.lastIndexOf('/')) }`;
                console.log(`Current output directory is ${ outputDir }`);
                await fs.ensureDir(outputDir);
                fs.readFile(`${ this.prefix }/${ f }`, (err, data) => {
                    console.info(`Current file is ${ this.prefix }/${ f }`);
                    if(err != null) {
                        console.error(`Error reading file: ${ err }`);
                    }
                    else {
                        const md = data.toString('utf-8');
                        const gray = matter(md);
                        gray.data.content = c.makeHtml(gray.content);
                        const template = hb.compile('{{#> layout }}' + tmpl + '{{/layout}}', { });
                        const output = template({ ...this.globals, ...gray.data });
                        fs.writeFile(`${ outputFile }`, output, (e) => {
                            if(e != null) {
                                console.error(`Failed to write file ${ e }`);
                            }
                        });
                    }
                });
            });
        });
    }
    public static(staticConfig: StaticConfig): void {
        console.log('Now running static configuration.');
        const templates = staticConfig.templates;
        console.info(`Current templates are ${ templates }`);
        const files = this.files.filter((e: string) => e.endsWith('.html'));
        console.info(`Current file length is ${ files.length }`);
        //await fs.ensureDir(`${ this.prefix }/${ this.destination }`);
        
        templates.forEach((tmpl: string) => {
            console.info(`Current template string is ${ tmpl }`);
            files.forEach(async (f) => {
                console.log(`Publishing file ${ f }`);
                const outputFile = `${ this.prefix }/${ this.destination }/${ f.replace(`${ this.source }/`,'').replace('.md','.html') }`;
                console.info(`Current output file is ${ outputFile }`);
                const outputDir = `${ outputFile.substr(0, outputFile.lastIndexOf('/')) }`;
                console.info(`Current output directory is ${ outputDir }`);
                await fs.ensureDir(outputDir);
                fs.readFile(`${ this.prefix }/${ f }`, (err, data) => {
                    console.info(`Current file is ${ this.prefix }/${ f }`);
                    if(err != null) {
                        console.error(`Error reading file: ${ err }`);
                    }
                    else {
                        const html = data.toString('utf-8');
                        const template = hb.compile('{{#> layout }}' + tmpl + '{{/layout}}', { });
                        const output = template({ ...this.globals, ...{ content: html } });
                        fs.writeFile(`${ outputFile }`, output, (e) => {
                            if(e != null) {
                                console.error(`Failed to write file ${ e }`);
                            }
                        });
                    }
                });
            });
        });
    }
    public async copy(assets: string[]): Promise<void> {
        await fs.ensureDir(`${ this.prefix }/${ this.destination }`);
        assets.forEach((asset) => {
            const asst = asset.split('/').pop();
            fs.copy(`${ this.prefix  }/${ asset }`, `${ this.prefix  }/${ this.destination }/${ asst }`)
                .then(() => console.log(`Finished copying to ${ this.prefix  }/${ this.destination }/${ asst }`))
                .catch(err => console.error(`Failed to copy to ${ this.prefix  }/${ this.destination }/${ asst } ${ err }`));
        });
        if(fs.existsSync(`${ this.prefix  }/serve.json`)) {
            fs.copyFile(`${ this.prefix  }/serve.json`, `${ this.prefix  }/${ this.destination }/serve.json`)
                .then(() => console.log(`Finished copying to ${ this.prefix  }/serve.json`))
                .catch(err => console.error(`Failed to copy to ${ this.prefix  }/${ this.destination }/serve.json ${ err }`));
        }
    }
}
