import * as fs from 'fs-extra';
import * as matter from 'gray-matter';
import { Converter } from 'showdown';
import { s } from '@quietmath/proto';
import { red } from 'chalk';
import { Publisher } from './publisher';
import { PubConfig } from './schema';
import { getOutputLink } from './structure';

export const addHashes = (pub: Publisher, key: string, offset: number): string => {
    const file: string = pub.files.find((e: string) => e.indexOf(key) !== -1);
    const range: number = file.split('/').length + offset;
    for(let i = 0; i < range; i++) {
        pub.summary += `#`;
    }
    return file.replace(`${ pub.config.source }`, '.');
};

export const buildOutline = (pub: Publisher, arr: any): void => {
    arr.forEach((itm: any | string): void => {
        if(typeof(itm) !== 'string') {
            const key: string = Object.keys(itm)[0];
            addHashes(pub, key, -1);
            pub.summary += ` ${ s(key.replace(/_/ig, ' ')).capWords().toString() }\n\n`;
            buildOutline(pub, itm[key]);
        }
        else {
            const anchor: string = addHashes(pub, itm, 0);
            pub.summary += ` [${ s(itm.replace(/\.md/ig,'').replace(/_/ig,' ')).capWords().toString() }](${ anchor })\n\n`;
        }
    });
};

export const getMarkdownConverter = (): Converter => {
    return new Converter({
        ghCompatibleHeaderId: true,
        parseImgDimensions: true,
        strikethrough: true,
        tables: true,
        ghCodeBlocks: true,
        tasklists: true,
        requireSpaceBeforeHeadingText: true
    });
};

export const getTemplateData = (file: any | string, config: PubConfig): any => {
    const c: Converter = getMarkdownConverter();
    try {
        let gray: any;
        if(typeof(file) === 'string') {
            const md = fs.readFileSync(file, { encoding: 'utf-8' });
            gray = matter(md);
        }
        else {
            gray = file;
        }
        gray.data.content = c.makeHtml(gray.content);
        gray.data['link'] = getOutputLink(file, config);
        return gray.data;
    }
    catch(e: any) {
        console.info(red(`Unable to open file ${ config.prefix }/${ file }: ${ e }`));
    }
    return;
};
