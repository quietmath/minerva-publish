/**
 * @module quietmath/minerva-publish
 */

export interface PubConfig {
    prefix: string;
    source: string;
    dest: string;
    layout: string;
    partials?: string[];
    assets: string[];
    output: OutputConfig;
    helpers: string;
    globals: any;
}

export interface OutputConfig {
    outline: boolean;
    includeFoldersInURL: boolean;
    includeDateInURL: boolean;
    includeExtension: boolean;
    categoryProperty: string;
    lists: ListConfig[];
    view: ViewConfig;
    static: StaticConfig;
    feeds: RSSConfig[];
}

export interface ListConfig {
    name: string;
    paging: string;
    folder: string;
    size: number;
    skip: number;
    order: OrderConfig;
    templates: string[];
    property: string;
    key: string;
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
    type: 'string' | 'number' | 'date';
}

export interface RSSConfig {
    name: string;
    template: string;
    maxItems: number;
    folder: string;
    property: string;
    key: string;
}
