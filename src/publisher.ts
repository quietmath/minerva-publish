/* eslint-disable no-inner-declarations */
import * as fs from 'fs-extra';
import * as hb from 'handlebars';
import { blue, red } from 'chalk';
import { JSONStore } from '@quietmath/moneta';
import { PubConfig } from './schema';
import { buildFileTree, getFilesFromDisc, storeFiles } from './file';
import { registerAllPartials, registerAllHelpers, registerExternalHelpers, registerExternalPartials } from './handlebars';
import { createLists } from './list';
import { createFeeds } from './feed';
import { createOutline } from './outline';
import { createTOC } from './toc';
import { createViews } from './view';
import { createStaticFiles } from './static';

/**
 * @module quietmath/minerva-publish
 */

export class Publisher {
    private store: JSONStore;
    public files: string[];
    public tree: any;
    public summary: string;
    public config: PubConfig;
    constructor(config: PubConfig) {
        this.config = config;
        if(this.config.prefix === undefined) {
            this.config.prefix = process.cwd();
        }           
        registerAllPartials(hb, this.config);
        registerAllHelpers(hb);
        if(this.config.partials) {
            registerExternalPartials(hb, this.config);
        }
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
            createOutline(this);
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
                createLists(i, this.config, this.store, this.files, hb);
            }
        }
    }
    public toc(): void {
        const outline: boolean = this.config?.output?.outline;
        if(outline) {
            createTOC(this.config, this.files, this.store, hb);
        }
    }
    public view(): void {
        if(this.config?.output?.view) {
            createViews(this.config, this.store, this.files, hb);
        }
    }
    public static(): void {
        if(this.config?.output?.static) {
            createStaticFiles(this.config, this.store, this.files, hb);
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
