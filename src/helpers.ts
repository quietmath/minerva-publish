import * as fs from 'fs-extra';
import * as moment from 'moment';
import { PubConfig } from './schema';

/**
 * @module quietmath/minerva-publish
 */

export const registerAllPartials = (hb: any, config: PubConfig): void => {
    hb.registerPartial('layout', fs.readFileSync(`${ config.prefix }/${ config.layout }`, 'utf8'));
};

export const registerAllHelpers = (hb: any): void => {

    hb.registerHelper('range', (current: number, start: number, end: number) => {
        const adjusted = current + 1;
        if((start <= adjusted) && (adjusted <= end)) {
            return true;
        }
        return false;
    });

    hb.registerHelper('formatRSSDate', (date: string): string => {
        return `${ moment(date).format('ddd, DD MMM YYYY hh:mm:ss') } EST`;
    });

};
