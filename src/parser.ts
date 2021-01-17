import { load, JSON_SCHEMA } from 'js-yaml';

/**
 * @module quietmath/minerva-publish
 */

export const parseYAML = (yaml: string): any => {
    try {
        console.info(`YAML string is ${ yaml }`);
        return load(yaml, { json: true, schema: JSON_SCHEMA });
    }
    catch (e) {
        console.error(`Error parsing YAML file: ${ e }`);
        return null;
    }
};
