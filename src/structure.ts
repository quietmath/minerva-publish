import { blue } from 'chalk';
import { PubConfig } from './schema';

export const getOutputLink = (path: string | any, config: PubConfig): string => {
    let p: string;
    if(typeof(path) === 'string') {
        p = path;
    }
    else {
        p = path.filePath;
    }
    p = p.replace(`${ config.prefix }`, '')
        .replace(`${ config.source }/`, '')
        .replace('.md', (config?.output?.includeExtension ? '.html' : ''));
    console.info(blue(`This output link path is ${ p }`));
    return p;
};
