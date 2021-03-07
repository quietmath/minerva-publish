import * as fs from 'fs-extra';
import * as moment from 'moment';
import { s } from '@quietmath/proto';
import { PubConfig } from './schema';

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

const truncateWordWithHTML = (content: string, words: number): string => {
    return s(content).truncateWordsWithHtml(words).toString();
};

export const registerAllPartials = (hb: any, config: PubConfig): void => {
    hb.registerPartial('layout', fs.readFileSync(`${ config.prefix }/${ config.layout }`, 'utf8'));
};

export const registerAllHelpers = (hb: any): void => {
    hb.registerHelper('range', range);
    hb.registerHelper('formatRSSDate', formatRSSDate);
    hb.registerHelper('defaultOr', defaultOr);
    hb.registerHelper('truncateWordWithHTML', truncateWordWithHTML);
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
