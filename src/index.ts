import * as yargs from 'yargs';
import * as fs from 'fs';
import { Publisher } from './publisher';
import { parseYAML } from './parser';
import { PubConfig } from './schema';

/**
 * @module quietmath/minerva-publish
 */

if(yargs.argv.f === undefined || (yargs.argv.f as string).trim() === '') {
    console.error('Error: No file specified with the `--f` command line switch.');
}
else {
    console.log(`Reading file ${ yargs.argv.f }`);
    const data = fs.readFileSync(yargs.argv.f as string, 'utf-8');
    if(data != null) {
        console.log(`Parsing file ${ yargs.argv.f }`);
        const yaml: PubConfig = parseYAML(data);
        const pub = new Publisher(yaml.path, yaml.source, yaml.dest, yaml.layout, yaml.globals);
        pub.sanity()
            .then(async () => {
                pub.outline(yaml.output?.outline);
                pub.toc(yaml.output?.outline);
                pub.list(yaml.output?.list);
                pub.view(yaml.output?.view);
                pub.static(yaml.output?.static);
                pub.copy(yaml.assets);
            }).catch((err) => {
                console.error(`Could not publish files: ${ err }`);
            });
        
    }
}
