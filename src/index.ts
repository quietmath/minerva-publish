import * as yargs from 'yargs';
import * as fs from 'fs';
import { Publisher } from './publisher';
import { parseYAML } from './parser';
import { pubConfig } from './schema';

/**
 * @module strangelooprun/minerva-publish
 */

if(yargs.argv.f === undefined || (yargs.argv.f as string).trim() === '') {
    console.error('Error: No file specified with the `--f` command line switch.');
}
else {
    console.log(`Reading file ${ yargs.argv.f }`);
    const data = fs.readFileSync(yargs.argv.f as string, 'utf-8');
    if(data != null) {
        console.log(`Parsing file ${ yargs.argv.f }`);
        const yaml: pubConfig = parseYAML(data);
        const pub = new Publisher(yaml.source, yaml.dest, yaml.layout, yaml.globals);
        pub.sanity()
            .then(() => {
                pub.outline(yaml.output?.outline);
                pub.toc(yaml.output?.outline);
                //pub.list(yaml.output?.list);
                pub.pages();
                pub.copy(yaml.assets);
            }).catch((err) => {
                console.error(`Could not publish files: ${ err }`);
            });
        
    }
}
