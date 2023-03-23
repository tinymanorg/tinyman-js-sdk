import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";
import {babel} from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

export default [
  {
    input: "src/index.ts",
    output: {
      dir: "dist",
      format: "cjs"
    },
    plugins: [
      resolve({extensions: [".js", ".jsx", ".ts", ".tsx"]}),
      commonjs(),
      babel({
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        babelHelpers: "bundled",
        include: ["src/**/*"]
      }),
      terser(),
      json()
    ],
    external: ["algosdk", "base64-js"]
  }
];
