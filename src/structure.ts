import { PubConfig } from './schema';

/**
 * @module quietmath/minerva-publish
 */

export const getOutputLink = (path: string | any, config: PubConfig): string => {
    let p: string;
    if(typeof(path) === 'string') {
        p = path;
    }
    else {
        p = path.filePath;
    }
    return p.replace(`${ config.prefix }`, '')
        .replace(`${ config.source }/`, '')
        .replace('.md', (config?.output?.includeExtension ? '.html' : ''));
};
