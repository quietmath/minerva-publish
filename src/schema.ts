/**
 * @module quietmath/minerva-publish
 */

export interface PubConfig {
    prefix: string;
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
    categoryProperty?: string;
    list?: ListConfig;
    view?: ViewConfig;
    static?: StaticConfig;
    rss?: RSSConfig;
    podcast?: PodcastConfig;
}

export interface ListConfig {
    pagingTemplate?: string;
    pagingFolder?: string;
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
    type: 'string' | 'number' | 'date';
}

export interface RSSConfig {
    template: string;
    maxItems?: number;
}

export interface PodcastConfig {
    pagingTemplate: string;
    templates: string[];
    rss?: RSSConfig;
    folder?: string;
    categoryProperty: string;
    key: string;
}
