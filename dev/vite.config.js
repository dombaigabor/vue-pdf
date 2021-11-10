import {defineConfig, loadEnv} from "vite";
import {createVuePlugin} from "vite-plugin-vue2";
import visualizer from "rollup-plugin-visualizer";
import path from "path";

export default ({mode}) => {
  process.env = {...process.env, ...loadEnv(mode, process.cwd())};

  return defineConfig({
        plugins: [
          createVuePlugin(),
          visualizer(),
        ],
        resolve: {
          alias: [
            {
              find: "@",
              replacement: path.resolve(__dirname, "src")
            }
          ]
        },
        define: {
          "process.env": process.env,
        }
      }
  );
};