/**
 * @module strangelooprun/minerva-publish
 */

export interface pubConfig {
    source: string;
    dest: string;
    layout: string;
    assets?: string[];
    output?: outputConfig;
    globals?: any;
}

export interface outputConfig {
    outline?: boolean;
    includeFoldersInURL?: boolean;
    includeDateInURL?: boolean;
    list?: listConfig;
}

export interface listConfig {
    size?: number;
    order?: orderConfig;
    templates: string[];
}

export interface orderConfig {
    orderBy: 'title' | 'date';
    direction: 'asc' | 'desc';
}
