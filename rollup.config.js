import typescript from "rollup-plugin-typescript2";
import {terser} from "rollup-plugin-terser";
import json from '@rollup/plugin-json';

export default [
  {
    input: "src/index.ts",
    output: {
      dir: "dist",
      format: "cjs"
    },
    plugins: [
      terser(),
      typescript({
        exclude: "**/__tests__/**",
        clean: true
      }),
      json()
    ],
    external: [
      "algosdk",
      "base64-js"
    ]
  }
]
