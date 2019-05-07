import sass from 'rollup-plugin-sass';
import uglify from 'rollup-plugin-uglify';
import merge from 'deepmerge';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';

const dev = {

    input: 'src/index.js',
    output: {
        name: 'Gantt',
        file: 'dist/frappe-gantt.js',
        format: 'iife'
    },

    plugins: [
        sass({
            output: 'dist/frappe-gantt.css'
        }),
        commonjs({
            include: [
                'node_modules/moment/**'
            ]
        }),
        resolve()
    ]
};

const prod = merge(dev, {
    output: {
        file: 'dist/frappe-gantt.min.js'
    },
    plugins: [uglify()]
});

export default [dev, prod];
