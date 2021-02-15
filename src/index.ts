import * as yargs from 'yargs';
import * as fs from 'fs';
import { blue, red } from 'chalk';
import { Publisher } from './publisher';
import { parseYAML } from './parser';

/**
 * @module quietmath/minerva-publish
 */

if(yargs.argv.f === undefined || (yargs.argv.f as string).trim() === '') {
    console.error(red('Error: No file specified with the `--f` command line switch.'));
}
else {
    console.info(blue(`Reading file ${ yargs.argv.f }`));
    const data: string = fs.readFileSync(yargs.argv.f as string, 'utf-8');
    if(data != null) {
        console.info(blue(`Parsing file ${ yargs.argv.f }`));
        console.log('Creating publishing engine.');
        const pub: Publisher = new Publisher(parseYAML(data));
        console.log('Publishing files');
        pub.sanity()
            .then(async (): Promise<void> => {
                pub.clean();
                pub.outline();
                pub.toc();
                pub.rss();
                pub.podcast();
                pub.podcastList();
                pub.list();
                pub.view();
                pub.static();
                await pub.copy();
            }).catch((err: any) => {
                console.error(red(`Could not publish files: ${ err }`));
            });
    }
}
