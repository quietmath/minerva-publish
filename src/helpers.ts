export const registerAllHelpers = (hb: any): void => {

    hb.registerHelper('range', (current: number, start: number, end: number) => {
        const adjusted = current + 1;
        if((start <= adjusted) && (adjusted <= end)) {
            return true;
        }
        return false;
    });

};
