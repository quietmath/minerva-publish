export const registerAllHelpers = (hb: any): void => {

    hb.registerHelper('first', (obj) => {
        if(obj != null && obj.length > 0) {
            return obj[0];
        }
        return null;
    });

};
