import * as glob from 'glob';
import * as fs from 'fs-extra';
import * as matter from 'gray-matter';
import * as moment from 'moment';
import { red } from 'chalk';
import { JSONStore } from '@quietmath/moneta';
import { PubConfig } from './schema';

/**
 * @module quietmath/minerva-publish
 */

const getFilename = (path: string): string => {
    return path.split('/').filter((e: string): number => {
        return e && e.length;
    }).reverse()[0];
};

const findSubPaths = (files: string[], path: string): string[] => {
    const rePath: string = path.replace('/', '\\/');
    const re = new RegExp('^' + rePath + '[^\\/]*\\/?$');
    return files.filter(function(i: string): boolean {
        return i !== path && re.test(i);
    });
};

const buildTree = (files: string[], path?: string): any[] => {
    path = path || '';
    const nodeList: any[] = [];
    findSubPaths(files, path).forEach(function(subPath: string): void {
        const nodeName = getFilename(subPath);
        if (/\/$/.test(subPath)) {
            const node = {};
            node[nodeName] = buildTree(files, subPath);
            nodeList.push(node);
        } else {
            nodeList.push(nodeName);
        }
    });
    return nodeList;
};

export const getAllFiles = (config: PubConfig): Promise<string[]> => {
    console.log('Retrieving all files.');
    return new Promise((resolve, reject): any => {
        glob(`${ config.prefix }/${ config.source }/**/**`, { 'ignore': ['**/node_modules/**', `**/${ config.prefix }/${ config.dest }/**`, '**/SUMMARY.md'], mark: true }, async (err: Error, files: string[]) => {
            if(err != null) {
                reject(`An error has occurred: ${ err }`);
            }
            resolve(files);
        });
    });
    
};

export const buildFileTree = (files: string[]): any => {
    return buildTree(files);
};

export const storeFiles = (files: string[], config: PubConfig): JSONStore => {
    const store = new JSONStore('minerva.json');
    store.create('pages');
    const sortColumn = config.output.list.order.orderBy;
    const keyType = config?.output?.list?.order?.type;
    files.forEach((f: string) => {
        try {
            if(fs.statSync(f).isFile() && f.endsWith('.md')) {
                const md = fs.readFileSync(f, { encoding: 'utf-8' });
                const gray = matter(md);
                gray['filePath'] = f;
                const sortKey = gray.data[sortColumn];
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
                            throw new Error(`The key ${ sortKey } is not a date. ${ e }`);
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
                //Break apart categories/tags and store in the data
                store.insert('pages', key, gray);
            }
        }
        catch(e) {
            console.error(red(`Error getting stats for file. ${ e }`));
        }
    });
    store.commit();
    return store;
};
