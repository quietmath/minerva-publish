import * as fs from 'fs-extra';
import * as moment from 'moment';
import { s } from '@quietmath/proto';
import { PubConfig } from './schema';
import { getTemplateData } from './helpers';

/**
 * @module quietmath/minerva-publish
 */

const range = (current: number, start: number, end: number): boolean => {
    const adjusted: number = current + 1;
    if((start <= adjusted) && (adjusted <= end)) {
        return true;
    }
    return false;
};

const formatRSSDate = (date: string): string => {
    if(date == null || date == '') {
        return `${ moment().format('ddd, DD MMM YYYY hh:mm:ss') } EST`;
    }
    return `${ moment(date).format('ddd, DD MMM YYYY hh:mm:ss') } EST`;
};

const defaultOr = (val: string, defaultVal: string): string => {
    if(val == null || val === '') {
        return defaultVal;
    }
    return val;
};

const truncateWordsWithHTML = (content: string, words: number): string => {
    return s(content).truncateWordsWithHtml(words).toString();
};

export const getAll = (files: any[], config: any, block: any): any => {
    let acc: any = '';
    files.forEach((file: any | string): void => {
        const result = getTemplateData(file, config);
        acc += block.fn(result);
    });
    return acc;
};

export const get = (key: string, value: string, files: any[], config: any, block: any): any => {
    const results = files.filter((e: any): any => e[key] = value);
    let acc: any = '';
    results.forEach((file: any): void => {
        const result = getTemplateData(file, config);
        acc += block.fn(result);
    });
    return acc;
};

export const getOne = (varName: string, key: string, value: string, files: any[], config: any, options: any): any => {
    const file = files.find((e: any): any => e[key] = value);
    const result = getTemplateData(file, config);
    options.data.root[varName] = result;
};

export const registerAllPartials = (hb: any, config: PubConfig): void => {
    hb.registerPartial('layout', fs.readFileSync(`${ config.prefix }/${ config.layout }`, 'utf8'));
};

export const registerExternalPartials = (hb: any, config: PubConfig): void => {
    console.info(`Loading external partials ${ JSON.stringify(config.partials) }`);   
    for(let i = 0; i < config.partials.length; i++) {
        const name = config.partials[i].split('/')
            .pop()
            .split('.')
            .shift();
        hb.registerPartial(name, fs.readFileSync(`${ config.prefix }/${ config.partials[i] }`, 'utf8'));
    }
};

export const registerAllHelpers = (hb: any): void => {
    hb.registerHelper('range', range);
    hb.registerHelper('formatRSSDate', formatRSSDate);
    hb.registerHelper('defaultOr', defaultOr);
    hb.registerHelper('truncateWordsWithHTML', truncateWordsWithHTML);
    hb.registerHelper('getAll', getAll);
    hb.registerHelper('get', get);
    hb.registerHelper('getOne', getOne);
};

export const registerExternalHelpers = (hb: any, config: PubConfig): void => {
    console.info(`Loading external helper file ${ config.prefix }/${ config.helpers }`);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const helpers: any = require(`${ config.prefix }/${ config.helpers }`);
    const keys: string[] = Object.keys(helpers);
    for(let i = 0; i < keys.length; i++) {
        hb.registerHelper(keys[i], helpers[keys[i]]);
    }
};
