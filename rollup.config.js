import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';
import strip from 'rollup-plugin-strip';
import uglify from 'rollup-plugin-uglify';

const prod = process.env.NODE_ENV === 'production';

export default {
    entry: 'src/boid.js',
    format: 'umd',
    moduleName: 'Boid',
    dest: (prod ? 'dist/boid.min.js' : 'dist/boid.js'),
    sourceMap: !prod,
    plugins: [
        nodeResolve({
            jsnext: true,
            main: true,
            preferBuiltins: false
        }),
        babel({
            babelrc: false,
            exclude: 'node_modules/**',
            presets: [
                ['es2015', {loose: true, modules: false}]
            ],
            plugins: [
                'external-helpers'
            ]
        }),
        (prod && strip({sourceMap: false})),
        (prod && uglify())
    ]
};
