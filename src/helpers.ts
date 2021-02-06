import * as fs from 'fs-extra';
import { PubConfig } from './schema';

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

};
