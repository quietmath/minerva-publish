import * as glob from 'glob';
import * as fs from 'fs-extra';
import * as matter from 'gray-matter';
import * as moment from 'moment';
import { red, yellow } from 'chalk';
import { JSONStore, ResultSet } from '@quietmath/moneta';
import { PubConfig } from './schema';

/**
 * @module quietmath/minerva-publish
 */

const getFilename = (path: string): string => {
    return path.split('/')
        .filter((e: string): number => {
            return e && e.length;
        }).reverse()[0];
};

const findSubPaths = (files: string[], path: string): string[] => {
    const rePath: string = path.replace('/', '\\/');
    const re = new RegExp('^' + rePath + '[^\\/]*\\/?$');
    return files.filter((i: string): boolean => {
        return i !== path && re.test(i);
    });
};

const buildTree = (files: string[], path?: string): any[] => {
    path = path || '';
    const nodeList: any[] = [];
    findSubPaths(files, path).forEach((subPath: string): void => {
        const nodeName: string = getFilename(subPath);
        if (/\/$/.test(subPath)) {
            const node: any = {};
            node[nodeName] = buildTree(files, subPath);
            nodeList.push(node);
        } else {
            nodeList.push(nodeName);
        }
    });
    return nodeList;
};

export const getFilesFromDisc = (config: PubConfig): Promise<string[]> => {
    return new Promise((resolve, reject): void => {
        glob(`${ config.prefix }/${ config.source }/**/**`, { 'ignore': ['**/node_modules/**', `**/${ config.prefix }/${ config.dest }/**`, '**/SUMMARY.md'], mark: true }, async (err: Error, files: string[]) => {
            if(err != null) {
                reject(`An error has occurred: ${ err }`);
            }
            resolve(files);
        });
    });
    
};

export const getFiles = (store: JSONStore, config: PubConfig, files: string[]): any[] | string[] => {
    if(store != null) {
        const pages: ResultSet = store.select('pages');
        if(config?.output?.list?.order?.direction == 'desc') {
            files = (pages.value as any[]).sort((a: any, b: any) => (b.result_key as string).localeCompare(a.result_key as string));
        }
        else {
            files = (pages.value as any[]).sort((a: any, b: any) => (a.result_key as string).localeCompare(b.result_key as string));
        }
    }
    else {
        if(config?.output?.list?.order?.direction != null) {
            console.warn(yellow(`The [orderDirection] of ${ config?.output?.list?.order?.direction } is not null, yet the files are not contained in storage. Falling back to the default.`));
        }
        files = files.filter((e: string) => e.endsWith('.md'));
    }
    return files;
};

export const buildFileTree = (files: string[]): any => {
    return buildTree(files);
};

export const storeFiles = (files: string[], config: PubConfig): JSONStore => {
    const store: JSONStore = new JSONStore('minerva.json');
    store.create('pages');
    const sortColumn: string = config?.output?.list?.order?.orderBy;
    const keyType: string = config?.output?.list?.order?.type;
    files.forEach((f: string): void => {
        try {
            if(fs.statSync(f).isFile() && f.endsWith('.md')) {
                const md: string = fs.readFileSync(f, { encoding: 'utf-8' });
                const gray: any = matter(md);
                gray['filePath'] = f;
                let sortKey: string = gray.data[sortColumn];
                if(sortKey === undefined && f.indexOf('/') !== -1) {
                    sortKey = f.split('/').pop();
                    if(sortKey.indexOf('.') !== -1) {
                        sortKey = sortKey.split('.').pop();
                    }
                }
                else {
                    throw new Error(`Failed to find key ${ keyType } in file ${ f }.`);
                }
                let key: string | number | Date;
                switch(keyType) {
                    case 'string':
                        break;
                    case 'number':
                        try {
                            key = parseInt(sortKey);
                        }
                        catch(e: any) {
                            throw new Error(`The key ${ sortKey } is not a number. ${ e }`);
                        }
                        break;
                    case 'date':
                        try {
                            const sortDate = moment(sortKey);
                            key = sortDate.format();
                        }
                        catch(e: any) {
                            throw new Error(`The key ${ sortKey } is not a date. ${ e }`);
                        }
                        break;
                    default:
                        try {
                            key = f.split('/').pop();
                        }
                        catch(e: any) {
                            throw new Error(`Failed to retrieve file name. ${ e }`);
                        }
                        break;
                }
                store.insert('pages', key as string, gray);
            }
        }
        catch(e: any) {
            console.error(red(`Error getting stats for file. ${ e }`));
        }
    });
    store.commit();
    return store;
};
