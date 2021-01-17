/**
 * @module quietmath/minerva-publish
 */

export interface PubConfig {
    path: 'absolute' | 'relative';
    source: string;
    dest: string;
    layout: string;
    assets?: string[];
    output?: OutputConfig;
    globals?: any;
}

export interface OutputConfig {
    outline?: boolean;
    includeFoldersInURL?: boolean;
    includeDateInURL?: boolean;
    includeExtension?: boolean;
    list?: ListConfig;
    view?: ViewConfig;
    static?: StaticConfig;
}

export interface ListConfig {
    index?: string;
    size?: number;
    order?: OrderConfig;
    templates: string[];
}

export interface ViewConfig {
    templates: string[];
}

export interface StaticConfig {
    templates: string[];
}

export interface OrderConfig {
    orderBy: 'title' | 'date';
    direction: 'asc' | 'desc';
}
