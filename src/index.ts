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
    console.info(`Reading file ${ yargs.argv.f }`);
    const data = fs.readFileSync(yargs.argv.f as string, 'utf-8');
    if(data != null) {
        console.info(`Parsing file ${ yargs.argv.f }`);
        const yaml: PubConfig = parseYAML(data);
        console.log('Creating publishing engine.');
        const pub = new Publisher(yaml.path, yaml.source, yaml.dest, yaml.layout, yaml.globals);
        console.log('Publishing files');
        pub.sanity()
            .then(async () => {
                pub.setOutputConfiguration(yaml.output);
                pub.outline(yaml.output?.outline);
                pub.toc(yaml.output?.outline);
                pub.list(yaml.output?.list);
                pub.view(yaml.output?.view);
                pub.static(yaml.output?.static);
                await pub.copy(yaml.assets);
            }).catch((err) => {
                console.error(`Could not publish files: ${ err }`);
            });
        
    }
}
