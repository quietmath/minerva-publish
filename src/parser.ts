import { load, JSON_SCHEMA } from 'js-yaml';

/**
 * @module strangelooprun/minerva-publish
 */

export function parseYAML(yaml: string): any {
    try {
        return load(yaml, { json: true, schema: JSON_SCHEMA });
    }
    catch (e) {
        console.error(`Error parsing YAML file: ${ e }`);
        return null;
    }
}
