import * as fs from 'fs-extra';
import * as moment from 'moment';
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

export const registerAllPartials = (hb: any, config: PubConfig): void => {
    hb.registerPartial('layout', fs.readFileSync(`${ config.prefix }/${ config.layout }`, 'utf8'));
};

export const registerAllHelpers = (hb: any): void => {
    hb.registerHelper('range', range);
    hb.registerHelper('formatRSSDate', formatRSSDate);
    hb.registerHelper('defaultOr', defaultOr);
};

export const registerExternalHelpers = (hb: any, config: PubConfig): void => {
    console.log(config.helpers);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const helpers = require(`${ config.prefix }/${ config.helpers }`);
    console.log(helpers);
    const keys = Object.keys(helpers);
    console.log(keys);
    for(let i = 0; i < keys.length; i++) {
        console.log(keys[i]);
        console.log(helpers[keys[i]]);
        hb.registerHelper(keys[i], helpers[keys[i]]);
    }
};
