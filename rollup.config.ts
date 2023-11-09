import rollupTypescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import pkg from './package.json' assert {type: 'json'}

export default [

    {
        input: 'src/index.ts',
        output: [
            {
                file: pkg.main,
                format: 'es',
                sourcemap: true,
            }, {
                file: pkg.main.replace('.esm.js', '.cjs.js'),
                format: 'cjs',
                sourcemap: true,
            },
        ],
        external: [
            'lucid-cardano',
        ],
        plugins: [
            rollupTypescript({
                tsconfig: 'tsconfig.json',
            }),
        ],
    }, {
        input: 'src/index.ts',
        output: [{
            file: 'dist/contract-lib.d.ts',
            format: 'es'
        }],
        plugins: [dts()],
    },
]
